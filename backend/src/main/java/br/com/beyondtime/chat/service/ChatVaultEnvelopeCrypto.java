package br.com.beyondtime.chat.service;

import br.com.beyondtime.shared.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Envelope Encryption (AES-256-GCM) para selar o segredo de desbloqueio do cofre biométrico.
 * A KEK fica exclusivamente em variável de ambiente (fora do PostgreSQL).
 */
@Service
public class ChatVaultEnvelopeCrypto {

    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_BITS = 128;

    private final SecretKey kek;
    private final SecureRandom secureRandom = new SecureRandom();

    public ChatVaultEnvelopeCrypto(
            @Value("${beyondtime.chat.vault.kek:}") String explicitKek,
            @Value("${beyondtime.security.jwt.secret:}") String fallbackJwtSecret) {
        this.kek = resolveKek(explicitKek, fallbackJwtSecret);
    }

    private SecretKey resolveKek(String explicitKek, String fallbackJwtSecret) {
        try {
            if (explicitKek != null && explicitKek.trim().getBytes(StandardCharsets.UTF_8).length >= 32) {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] keyBytes = digest.digest(explicitKek.trim().getBytes(StandardCharsets.UTF_8));
                return new SecretKeySpec(keyBytes, "AES");
            }
            if (fallbackJwtSecret != null && fallbackJwtSecret.trim().getBytes(StandardCharsets.UTF_8).length >= 32) {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(fallbackJwtSecret.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                byte[] derived = mac.doFinal("beyondtime-chat-vault-kek-v1".getBytes(StandardCharsets.UTF_8));
                return new SecretKeySpec(derived, "AES");
            }
            throw new IllegalStateException("CHAT_VAULT_KEK (mínimo 32 bytes) é obrigatória para selar o cofre biométrico.");
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao inicializar chave de envelope AES-256-GCM.", ex);
        }
    }

    public SealedEnvelope seal(String plainVaultSecret) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, kek, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plainVaultSecret.getBytes(StandardCharsets.UTF_8));

            return new SealedEnvelope(
                    Base64.getEncoder().encodeToString(ciphertext),
                    Base64.getEncoder().encodeToString(iv)
            );
        } catch (Exception ex) {
            throw new BusinessException(
                    "VAULT_SEAL_ERROR",
                    "Não foi possível proteger o cofre biométrico no servidor.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    public String unseal(String sealedCiphertextB64, String sealedIvB64) {
        try {
            byte[] iv = Base64.getDecoder().decode(sealedIvB64);
            byte[] ciphertext = Base64.getDecoder().decode(sealedCiphertextB64);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, kek, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] plainBytes = cipher.doFinal(ciphertext);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new BusinessException(
                    "VAULT_UNSEAL_ERROR",
                    "Não foi possível destrancar o envelope do cofre biométrico.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    public record SealedEnvelope(String sealedCiphertext, String sealedIv) {
    }
}
