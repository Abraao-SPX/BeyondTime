package br.com.beyondtime.chat.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatVaultEnvelopeCryptoTest {

    private static final String LEGACY_JWT_SECRET =
            "legacy_jwt_secret_key_with_at_least_32_bytes_for_test_2026";
    private static final String EXPLICIT_VAULT_KEK =
            "dedicated_chat_vault_kek_secret_with_at_least_32_bytes_2026";

    @Test
    void deveDesempacotarCofreAntigoSeladoComJwtSecretAposConfigurarChatVaultKekDedicada() {
        // 1. Cofre antigo selado antes de definir CHAT_VAULT_KEK (usando fallback do JWT)
        ChatVaultEnvelopeCrypto legacyCrypto = new ChatVaultEnvelopeCrypto("", LEGACY_JWT_SECRET);
        ChatVaultEnvelopeCrypto.SealedEnvelope oldEnvelope = legacyCrypto.seal("segredo-antigo-do-cofre-e2ee");

        // 2. Após separar CHAT_VAULT_KEK, novos cofres usam a KEK dedicada e cofres antigos continuam legíveis
        ChatVaultEnvelopeCrypto migratedCrypto = new ChatVaultEnvelopeCrypto(EXPLICIT_VAULT_KEK, LEGACY_JWT_SECRET);
        assertThat(migratedCrypto.unseal(oldEnvelope.sealedCiphertext(), oldEnvelope.sealedIv()))
                .isEqualTo("segredo-antigo-do-cofre-e2ee");

        ChatVaultEnvelopeCrypto.SealedEnvelope newEnvelope = migratedCrypto.seal("segredo-novo-do-cofre-e2ee");
        assertThat(migratedCrypto.unseal(newEnvelope.sealedCiphertext(), newEnvelope.sealedIv()))
                .isEqualTo("segredo-novo-do-cofre-e2ee");
    }
}
