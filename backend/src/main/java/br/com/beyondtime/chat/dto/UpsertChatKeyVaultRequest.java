package br.com.beyondtime.chat.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpsertChatKeyVaultRequest(
        @NotBlank(message = "A chave pública JWK é obrigatória.")
        @Size(max = 4096)
        String publicKeyJwk,

        @NotBlank(message = "O cofre cifrado da chave privada é obrigatório.")
        @Size(max = 8192)
        String encryptedPrivateKey,

        @NotBlank(message = "O salt de derivação (PBKDF2) é obrigatório.")
        @Size(max = 128)
        String kdfSalt,

        @NotBlank(message = "O vetor de inicialização (IV) do cofre é obrigatório.")
        @Size(max = 128)
        String kdfIv,

        @Min(value = 100000, message = "PBKDF2 deve usar no mínimo 100.000 iterações.")
        @Max(value = 1000000, message = "Número máximo de iterações PBKDF2 excedido.")
        int kdfIterations,

        @Size(max = 40)
        String keyAlgorithm
) {
}
