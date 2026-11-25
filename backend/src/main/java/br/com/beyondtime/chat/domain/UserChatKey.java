package br.com.beyondtime.chat.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_chat_keys")
public class UserChatKey {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "public_key_jwk", nullable = false, columnDefinition = "TEXT")
    private String publicKeyJwk;

    @Column(name = "encrypted_private_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedPrivateKey;

    @Column(name = "kdf_salt", nullable = false, length = 128)
    private String kdfSalt;

    @Column(name = "kdf_iv", nullable = false, length = 128)
    private String kdfIv;

    @Column(name = "kdf_iterations", nullable = false)
    private int kdfIterations = 310000;

    @Column(name = "key_algorithm", nullable = false, length = 40)
    private String keyAlgorithm = "ECDH-P256";

    @Column(name = "key_version", nullable = false)
    private int keyVersion = 1;

    @Column(name = "unlock_mode", nullable = false, length = 20)
    private String unlockMode = "PIN";

    @Column(name = "sealed_vault_secret", columnDefinition = "TEXT")
    private String sealedVaultSecret;

    @Column(name = "sealed_vault_iv", length = 128)
    private String sealedVaultIv;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected UserChatKey() {
    }

    public UserChatKey(
            UUID userId,
            String publicKeyJwk,
            String encryptedPrivateKey,
            String kdfSalt,
            String kdfIv,
            int kdfIterations,
            String keyAlgorithm) {
        this.userId = userId;
        this.publicKeyJwk = publicKeyJwk;
        this.encryptedPrivateKey = encryptedPrivateKey;
        this.kdfSalt = kdfSalt;
        this.kdfIv = kdfIv;
        this.kdfIterations = kdfIterations;
        this.keyAlgorithm = keyAlgorithm != null ? keyAlgorithm : "ECDH-P256";
        this.keyVersion = 1;
        this.unlockMode = "PIN";
    }

    public static UserChatKey createBiometric(
            UUID userId,
            String publicKeyJwk,
            String encryptedPrivateKey,
            String kdfSalt,
            String kdfIv,
            int kdfIterations,
            String keyAlgorithm,
            String sealedVaultSecret,
            String sealedVaultIv) {
        UserChatKey entity = new UserChatKey(
                userId, publicKeyJwk, encryptedPrivateKey, kdfSalt, kdfIv, kdfIterations, keyAlgorithm
        );
        entity.unlockMode = "BIOMETRIC";
        entity.sealedVaultSecret = sealedVaultSecret;
        entity.sealedVaultIv = sealedVaultIv;
        return entity;
    }

    public void rotateVault(
            String publicKeyJwk,
            String encryptedPrivateKey,
            String kdfSalt,
            String kdfIv,
            int kdfIterations,
            String keyAlgorithm) {
        this.publicKeyJwk = publicKeyJwk;
        this.encryptedPrivateKey = encryptedPrivateKey;
        this.kdfSalt = kdfSalt;
        this.kdfIv = kdfIv;
        this.kdfIterations = kdfIterations;
        this.keyAlgorithm = keyAlgorithm != null ? keyAlgorithm : "ECDH-P256";
        this.unlockMode = "PIN";
        this.sealedVaultSecret = null;
        this.sealedVaultIv = null;
        this.keyVersion += 1;
    }

    public void rotateBiometricVault(
            String publicKeyJwk,
            String encryptedPrivateKey,
            String kdfSalt,
            String kdfIv,
            int kdfIterations,
            String keyAlgorithm,
            String sealedVaultSecret,
            String sealedVaultIv) {
        this.publicKeyJwk = publicKeyJwk;
        this.encryptedPrivateKey = encryptedPrivateKey;
        this.kdfSalt = kdfSalt;
        this.kdfIv = kdfIv;
        this.kdfIterations = kdfIterations;
        this.keyAlgorithm = keyAlgorithm != null ? keyAlgorithm : "ECDH-P256";
        this.unlockMode = "BIOMETRIC";
        this.sealedVaultSecret = sealedVaultSecret;
        this.sealedVaultIv = sealedVaultIv;
        this.keyVersion += 1;
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public String getPublicKeyJwk() {
        return publicKeyJwk;
    }

    public String getEncryptedPrivateKey() {
        return encryptedPrivateKey;
    }

    public String getKdfSalt() {
        return kdfSalt;
    }

    public String getKdfIv() {
        return kdfIv;
    }

    public int getKdfIterations() {
        return kdfIterations;
    }

    public String getKeyAlgorithm() {
        return keyAlgorithm;
    }

    public int getKeyVersion() {
        return keyVersion;
    }

    public String getUnlockMode() {
        return unlockMode;
    }

    public String getSealedVaultSecret() {
        return sealedVaultSecret;
    }

    public String getSealedVaultIv() {
        return sealedVaultIv;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
