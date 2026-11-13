package br.com.beyondtime.biometrics.service;

import br.com.beyondtime.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

@Service
public class BiometricTokenValidator {

    private final String secretKey;
    private final ObjectMapper objectMapper;

    public BiometricTokenValidator(
            @Value("${beyondtime.biometrics.jwt.secret:}") String secretKey,
            ObjectMapper objectMapper) {
        String cleanKey = (secretKey != null) ? secretKey.trim() : "";
        if (cleanKey.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "CONFIG_ERROR: BIOMETRIA_JWT_SECRET_KEY deve estar configurada e possuir no mínimo 32 bytes (256 bits). " +
                    "A validação biométrica requer modo estrito (fail-closed) para evitar bypass de segurança."
            );
        }
        this.secretKey = cleanKey;
        this.objectMapper = objectMapper;
    }

    public record BiometricClaims(
            String sub,
            boolean verified,
            String biometricsModel,
            Double distance,
            Double threshold,
            Long exp,
            String iss,
            String jti
    ) {
    }

    public BiometricClaims validateAndParse(String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessException("INVALID_BIOMETRIC_TOKEN", "O token biométrico não foi fornecido.", HttpStatus.BAD_REQUEST);
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) {
            throw new BusinessException("INVALID_BIOMETRIC_TOKEN", "Formato inválido de token biométrico.", HttpStatus.BAD_REQUEST);
        }

        String headerB64 = parts[0];
        String payloadB64 = parts[1];
        String signatureB64 = parts[2];

        // 1. Validação obrigatória de assinatura HMAC-SHA256 (Fail-Closed)
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            String dataToSign = headerB64 + "." + payloadB64;
            byte[] expectedSignatureBytes = mac.doFinal(dataToSign.getBytes(StandardCharsets.UTF_8));
            String expectedSignatureB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(expectedSignatureBytes);

            if (!MessageDigest.isEqual(expectedSignatureB64.getBytes(StandardCharsets.UTF_8), signatureB64.getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException("INVALID_BIOMETRIC_SIGNATURE", "Assinatura do token biométrico é inválida ou foi corrompida.", HttpStatus.UNAUTHORIZED);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("BIOMETRIC_VERIFICATION_ERROR", "Erro ao processar assinatura biométrica: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // 2. Decodificação do Payload
        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(payloadB64);
            JsonNode root = objectMapper.readTree(payloadBytes);

            String sub = root.hasNonNull("sub") ? root.get("sub").asText() : null;
            boolean verified = root.hasNonNull("verified") && root.get("verified").asBoolean();
            String model = root.hasNonNull("biometrics_model") ? root.get("biometrics_model").asText() : "YuNet-SFace";
            Double distance = root.hasNonNull("distance") ? root.get("distance").asDouble() : null;
            Double threshold = root.hasNonNull("threshold") ? root.get("threshold").asDouble() : null;
            Long exp = root.hasNonNull("exp") ? root.get("exp").asLong() : null;
            String iss = root.hasNonNull("iss") ? root.get("iss").asText() : null;
            String jti = root.hasNonNull("jti") ? root.get("jti").asText() : null;

            if (sub == null || sub.isBlank()) {
                throw new BusinessException("INVALID_BIOMETRIC_TOKEN", "O token biométrico não contém o identificador do usuário (sub).", HttpStatus.BAD_REQUEST);
            }

            // 3. Validação de expiração estrita
            if (exp == null) {
                throw new BusinessException("INVALID_BIOMETRIC_TOKEN", "O token biométrico deve possuir prazo de validade (exp).", HttpStatus.BAD_REQUEST);
            }
            if (Instant.ofEpochSecond(exp).isBefore(Instant.now())) {
                throw new BusinessException("EXPIRED_BIOMETRIC_TOKEN", "O token biométrico expirou. Realize uma nova verificação facial.", HttpStatus.UNAUTHORIZED);
            }

            // 4. Validação de resultado de vivacidade e match
            if (!verified) {
                throw new BusinessException("BIOMETRICS_NOT_VERIFIED", "A prova de vida ou o reconhecimento facial não foram aprovados.", HttpStatus.BAD_REQUEST);
            }

            return new BiometricClaims(sub, verified, model, distance, threshold, exp, iss, jti);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("INVALID_BIOMETRIC_PAYLOAD", "Falha ao decodificar dados biométricos do token: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }
}
