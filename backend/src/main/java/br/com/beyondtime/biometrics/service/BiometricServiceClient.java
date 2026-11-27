package br.com.beyondtime.biometrics.service;

import br.com.beyondtime.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

/**
 * Cliente HTTP interno server-to-server para comunicação autenticada (X-Internal-Api-Key)
 * com o microsserviço de reconhecimento facial (RF11) e exclusão LGPD (RF14).
 */
@Service
public class BiometricServiceClient {

    private static final Logger log = LoggerFactory.getLogger(BiometricServiceClient.class);
    private static final int MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB

    private final String baseUrl;
    private final String internalApiKey;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public BiometricServiceClient(
            @Value("${beyondtime.biometrics.service-url:http://localhost:8000}") String baseUrl,
            @Value("${beyondtime.biometrics.internal-api-key:}") String internalApiKey,
            ObjectMapper objectMapper) {
        this.baseUrl = (baseUrl != null ? baseUrl.trim().replaceAll("/+$", "") : "");
        this.internalApiKey = (internalApiKey != null ? internalApiKey.trim() : "");
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    /**
     * RF14 / LGPD — Remove embeddings faciais, fotos e logs biométricos do titular no microsserviço Python.
     * Retorna true se a remoção foi confirmada (HTTP 2xx/404) ou se o serviço não estiver configurado em testes isolados.
     */
    public boolean deleteUserBiometrics(UUID userId) {
        if (userId == null || baseUrl.isBlank()) {
            return true;
        }

        try {
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/users/" + userId))
                    .timeout(Duration.ofSeconds(5))
                    .DELETE();

            if (!internalApiKey.isBlank()) {
                reqBuilder.header("X-Internal-Api-Key", internalApiKey);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if ((status >= 200 && status < 300) || status == 404) {
                log.info("[BeyondTime RF14/RF11] Exclusão biométrica confirmada (HTTP {}) para userId={}", status, userId);
                return true;
            }
            log.warn("[BeyondTime RF14/RF11] Falha ao remover biometria de userId={} (HTTP {}). Agendado para retentativa.", userId, status);
            return false;
        } catch (Exception ex) {
            log.warn("[BeyondTime RF14/RF11] Microsserviço biométrico indisponível na exclusão de userId={} ({}). Agendado para retentativa.",
                    userId, ex.getMessage());
            return false;
        }
    }

    public void deleteUserBiometricsQuietly(UUID userId) {
        deleteUserBiometrics(userId);
    }

    /**
     * Consulta de forma autenticada (server-to-server) se o titular já possui rosto cadastrado no serviço biométrico.
     */
    public boolean isUserEnrolled(UUID userId) {
        if (userId == null || baseUrl.isBlank()) {
            return false;
        }
        try {
            String encodedId = URLEncoder.encode(userId.toString(), StandardCharsets.UTF_8);
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/enrollment-status/" + encodedId))
                    .timeout(Duration.ofSeconds(4))
                    .GET();
            if (!internalApiKey.isBlank()) {
                reqBuilder.header("X-Internal-Api-Key", internalApiKey);
            }
            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode node = objectMapper.readTree(response.body());
                return node.path("enrolled").asBoolean(false);
            }
            return false;
        } catch (Exception ex) {
            log.warn("[BeyondTime RF11] Falha ao consultar enrollment-status de userId={}: {}", userId, ex.getMessage());
            return false;
        }
    }

    /**
     * SEC-CRIT-01 — Encaminha o vídeo de prova de vida ao microsserviço Python com userId confiável
     * extraído no servidor Java e cabeçalho X-Internal-Api-Key.
     */
    public String submitLivenessVideo(
            UUID trustedUserId,
            String firstName,
            byte[] videoBytes,
            String filename,
            String contentType,
            String expectedColors,
            String sessionToken,
            boolean alreadyEnrolled) {
        if (trustedUserId == null) {
            throw new BusinessException("UNAUTHENTICATED", "Usuário não autenticado.", HttpStatus.UNAUTHORIZED);
        }
        if (baseUrl.isBlank()) {
            throw new BusinessException("BIOMETRICS_UNAVAILABLE", "Serviço de biometria não configurado.", HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (videoBytes == null || videoBytes.length == 0) {
            throw new BusinessException("EMPTY_VIDEO", "Vídeo de prova de vida vazio. Tente novamente.", HttpStatus.BAD_REQUEST);
        }
        if (videoBytes.length > MAX_VIDEO_BYTES) {
            throw new BusinessException("VIDEO_TOO_LARGE", "Vídeo excede o tamanho máximo permitido (15 MB).", HttpStatus.PAYLOAD_TOO_LARGE);
        }

        String endpoint = alreadyEnrolled ? "/verify" : "/register";
        String boundary = "----BeyondTimeBioBoundary" + UUID.randomUUID().toString().replace("-", "");

        try {
            byte[] multipartBody = buildMultipartPayload(
                    boundary,
                    trustedUserId.toString(),
                    firstName,
                    expectedColors,
                    sessionToken,
                    videoBytes,
                    filename,
                    contentType,
                    alreadyEnrolled
            );

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + endpoint))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(multipartBody));

            if (!internalApiKey.isBlank()) {
                reqBuilder.header("X-Internal-Api-Key", internalApiKey);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            JsonNode bodyNode = null;
            try {
                bodyNode = objectMapper.readTree(response.body());
            } catch (Exception ignored) {
                // resposta não JSON
            }

            if (status == 429) {
                throw new BusinessException(
                        "BIOMETRICS_RATE_LIMITED",
                        "Muitas tentativas seguidas. Aguarde 1 minuto e tente novamente.",
                        HttpStatus.TOO_MANY_REQUESTS
                );
            }

            boolean approved = bodyNode != null
                    && (bodyNode.path("success").asBoolean(false) || bodyNode.path("verified").asBoolean(false));
            String jwtToken = bodyNode != null ? bodyNode.path("jwt_token").asText("") : "";

            if (status >= 200 && status < 300 && approved && !jwtToken.isBlank()) {
                return jwtToken;
            }

            String reason = extractReason(bodyNode, alreadyEnrolled);
            HttpStatus mappedStatus = (status >= 400 && status < 500)
                    ? HttpStatus.valueOf(status)
                    : HttpStatus.UNPROCESSABLE_ENTITY;
            throw new BusinessException("BIOMETRIC_VERIFICATION_FAILED", reason, mappedStatus);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.warn("[BeyondTime RF11] Erro ao encaminhar vídeo biométrico para {}: {}", endpoint, ex.getMessage());
            throw new BusinessException(
                    "BIOMETRICS_SERVICE_ERROR",
                    "Não foi possível processar a verificação facial agora. Tente novamente em instantes.",
                    HttpStatus.BAD_GATEWAY
            );
        }
    }

    private String extractReason(JsonNode bodyNode, boolean alreadyEnrolled) {
        if (bodyNode != null) {
            for (String field : new String[]{"reason", "detail", "error"}) {
                String value = bodyNode.path(field).asText("").trim();
                if (!value.isEmpty() && !"null".equalsIgnoreCase(value)) {
                    return value;
                }
            }
        }
        return alreadyEnrolled
                ? "Rosto não reconhecido ou prova de vida reprovada. Apenas o titular da conta pode entrar."
                : "Prova de vida não aprovada. Fique de frente para a tela e tente novamente.";
    }

    private byte[] buildMultipartPayload(
            String boundary,
            String userId,
            String firstName,
            String expectedColors,
            String sessionToken,
            byte[] videoBytes,
            String filename,
            String contentType,
            boolean alreadyEnrolled) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeFormField(out, boundary, "user_id", userId);
        writeFormField(out, boundary, "expected_colors", expectedColors != null ? expectedColors : "");
        if (sessionToken != null && !sessionToken.isBlank()) {
            writeFormField(out, boundary, "session_token", sessionToken.trim());
        }
        if (!alreadyEnrolled) {
            String safeName = (firstName != null && !firstName.isBlank()) ? firstName.trim() : "Usuário";
            writeFormField(out, boundary, "name", safeName);
        }

        String safeFilename = (filename != null && !filename.isBlank())
                ? filename.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "liveness.webm";
        String safeContentType = (contentType != null && !contentType.isBlank())
                ? contentType
                : "video/webm";

        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"video\"; filename=\"" + safeFilename + "\"\r\n")
                .getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + safeContentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(videoBytes);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private void writeFormField(ByteArrayOutputStream out, String boundary, String name, String value) throws IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(value.getBytes(StandardCharsets.UTF_8));
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }
}
