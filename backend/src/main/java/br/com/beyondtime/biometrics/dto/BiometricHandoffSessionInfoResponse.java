package br.com.beyondtime.biometrics.dto;

import java.time.OffsetDateTime;

/**
 * Dados mínimos necessários para o navegador do celular conduzir a captura biométrica
 * sem expor JWT principal, e-mail, telefone ou qualquer dado sensível (LGPD).
 */
public record BiometricHandoffSessionInfoResponse(
        String userId,
        String firstName,
        String status,
        OffsetDateTime expiresAt
) {
}
