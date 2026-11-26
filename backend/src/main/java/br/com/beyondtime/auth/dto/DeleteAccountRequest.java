package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record DeleteAccountRequest(
        @Size(max = 72, message = "A senha excede o tamanho máximo permitido.")
        String password,
        @NotNull(message = "A confirmação no modal de segurança (RF-06) é obrigatória.")
        @AssertTrue(message = "Confirme a exclusão da conta no modal de segurança (RF-06) para prosseguir.")
        Boolean confirmedViaDefensiveModal
) {
}
