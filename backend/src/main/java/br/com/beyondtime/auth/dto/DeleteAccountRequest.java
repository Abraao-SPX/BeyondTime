package br.com.beyondtime.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public record DeleteAccountRequest(
        String password,
        @NotNull(message = "A confirmação no modal de segurança (RF-06) é obrigatória.")
        @AssertTrue(message = "Confirme a exclusão da conta no modal de segurança (RF-06) para prosseguir.")
        Boolean confirmedViaDefensiveModal
) {
}
