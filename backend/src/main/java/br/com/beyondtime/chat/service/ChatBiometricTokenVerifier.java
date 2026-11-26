package br.com.beyondtime.chat.service;

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

/**
 * Validador fail-closed do JWT Biométrico emitido pelo microsserviço RF-11 (reconhecimento-facial).
 * 100% compatível com o contrato HMAC-SHA256 e claims (sub, verified, exp, jti) do BiometricTokenValidator.
 */
@Service
public class ChatBiometricTokenVerifier {

    private final String biometricSecret;
    private final ObjectMapper objectMapper;

    public ChatBiometricTokenVerifier(
            @Value("${beyondtime.biometrics.jwt.secret:}") String biometricSecret,
            ObjectMapper objectMapper) {
        this.biometricSecret = biometricSecret != null ? biometricSecret.trim() : "";
        this.objectMapper = objectMapper;
    }

    public record VerifiedBiometricClaims(
            String sub,
            boolean verified,
            String jti,
            long exp
    ) {
    }

    public VerifiedBiometricClaims validateFailClosed(String token) {
        if (biometricSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new BusinessException(
                    "BIOMETRIC_SECRET_NOT_CONFIGURED",
                    "Serviço de desbloqueio biométrico não configurado (BIOMETRIA_JWT_SECRET_KEY ausente).",
                    HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        if (token == null || token.isBlank()) {
            throw new BusinessException(
                    "INVALID_BIOMETRIC_TOKEN",
                    "O token de prova de vida facial é obrigatório.",
                    HttpStatus.BAD_REQUEST
            );
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) {
            throw new BusinessException(
                    "INVALID_BIOMETRIC_TOKEN",
                    "Formato inválido de token biométrico.",
                    HttpStatus.BAD_REQUEST
            );
        }

        String headerB64 = parts[0];
        String payloadB64 = parts[1];
        String signatureB64 = parts[2];

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(biometricSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expectedSigBytes = mac.doFinal((headerB64 + "." + payloadB64).getBytes(StandardCharsets.UTF_8));
            String expectedSigB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(expectedSigBytes);

            if (!MessageDigest.isEqual(
                    expectedSigB64.getBytes(StandardCharsets.UTF_8),
                    signatureB64.getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException(
                        "INVALID_BIOMETRIC_SIGNATURE",
                        "Assinatura do token biométrico inválida.",
                        HttpStatus.UNAUTHORIZED
                );
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(
                    "BIOMETRIC_VERIFICATION_ERROR",
                    "Erro ao validar assinatura biométrica.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(payloadB64);
            JsonNode root = objectMapper.readTree(payloadBytes);

            String sub = root.hasNonNull("sub") ? root.get("sub").asText() : null;
            boolean verified = root.hasNonNull("verified") && root.get("verified").asBoolean();
            Long exp = root.hasNonNull("exp") ? root.get("exp").asLong() : null;
            String iss = root.hasNonNull("iss") ? root.get("iss").asText() : null;
            String jti = root.hasNonNull("jti") ? root.get("jti").asText() : null;

            if (sub == null || sub.isBlank()) {
                throw new BusinessException("INVALID_BIOMETRIC_TOKEN", "Token biométrico sem identificador do usuário.", HttpStatus.BAD_REQUEST);
            }
            if (iss == null || !"reconhecimento-facil-service".equals(iss.trim())) {
                throw new BusinessException("INVALID_BIOMETRIC_ISSUER", "Emissor (iss) do token biométrico não reconhecido.", HttpStatus.UNAUTHORIZED);
            }
            if (jti == null || jti.isBlank()) {
                throw new BusinessException("INVALID_BIOMETRIC_TOKEN", "Token biométrico sem identificador único (jti).", HttpStatus.BAD_REQUEST);
            }
            if (exp == null || Instant.ofEpochSecond(exp).isBefore(Instant.now())) {
                throw new BusinessException("EXPIRED_BIOMETRIC_TOKEN", "A validação facial expirou. Faça uma nova leitura facial.", HttpStatus.UNAUTHORIZED);
            }
            if (!verified) {
                throw new BusinessException("BIOMETRICS_NOT_VERIFIED", "A prova de vida facial não foi aprovada.", HttpStatus.BAD_REQUEST);
            }

            return new VerifiedBiometricClaims(sub, true, jti, exp);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("INVALID_BIOMETRIC_PAYLOAD", "Falha ao ler payload do token biométrico.", HttpStatus.BAD_REQUEST);
        }
    }
}
