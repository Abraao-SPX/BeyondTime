package br.com.beyondtime.biometrics.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

/**
 * Cliente HTTP interno para comunicação server-to-server com o microsserviço
 * de reconhecimento facial (RF11), especialmente para revogação/exclusão LGPD (RF14).
 */
@Service
public class BiometricServiceClient {

    private static final Logger log = LoggerFactory.getLogger(BiometricServiceClient.class);

    private final String baseUrl;
    private final String internalApiKey;
    private final HttpClient httpClient;

    public BiometricServiceClient(
            @Value("${beyondtime.biometrics.service-url:http://localhost:8000}") String baseUrl,
            @Value("${beyondtime.biometrics.internal-api-key:}") String internalApiKey) {
        this.baseUrl = (baseUrl != null ? baseUrl.trim().replaceAll("/+$", "") : "");
        this.internalApiKey = (internalApiKey != null ? internalApiKey.trim() : "");
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
    }

    /**
     * RF14 / LGPD — Remove embeddings faciais e fotos biométricas do titular no microsserviço Python.
     * Operação best-effort para não bloquear a exclusão da conta caso o usuário nunca tenha cadastrado biometria
     * ou o microsserviço esteja indisponível em ambiente de testes isolados.
     */
    public void deleteUserBiometricsQuietly(UUID userId) {
        if (userId == null || baseUrl.isBlank()) {
            return;
        }

        try {
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/users/" + userId))
                    .timeout(Duration.ofSeconds(3))
                    .DELETE();

            if (!internalApiKey.isBlank()) {
                reqBuilder.header("X-Internal-Api-Key", internalApiKey);
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                log.info("[BeyondTime RF14/RF11] Biometria facial removida no microsserviço para userId={}", userId);
            } else if (status == 404) {
                log.debug("[BeyondTime RF14/RF11] Usuário userId={} não possuía biometria cadastrada.", userId);
            } else {
                log.warn("[BeyondTime RF14/RF11] Falha ao remover biometria de userId={} (HTTP {}).", userId, status);
            }
        } catch (Exception ex) {
            log.warn("[BeyondTime RF14/RF11] Não foi possível contatar serviço biométrico para exclusão de userId={}: {}",
                    userId, ex.getMessage());
        }
    }
}
