package br.com.beyondtime.shared.util;

import br.com.beyondtime.shared.exception.BusinessException;

import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;

public final class AgeValidator {

    public static final int MINIMUM_AGE_BEYONDTIME = 50;
    public static final ZoneId SERGIPE_ZONE = ZoneId.of("America/Maceio");

    private AgeValidator() {
    }

    public static int calculateAge(LocalDate birthDate) {
        if (birthDate == null) {
            throw new BusinessException("BIRTH_DATE_REQUIRED", "A data de nascimento é obrigatória.");
        }
        LocalDate today = LocalDate.now();
        if (birthDate.isAfter(today)) {
            throw new BusinessException("INVALID_BIRTH_DATE", "A data de nascimento não pode ser uma data futura.");
        }
        return Period.between(birthDate, today).getYears();
    }

    public static void enforceMinimumAge50Plus(LocalDate birthDate) {
        int age = calculateAge(birthDate);
        if (age < MINIMUM_AGE_BEYONDTIME) {
            throw new BusinessException(
                    "UNDER_MINIMUM_AGE_50",
                    "O BeyondTime é uma plataforma exclusiva para pessoas com 50 anos ou mais."
            );
        }
        if (age > 120) {
            throw new BusinessException(
                    "INVALID_BIRTH_DATE",
                    "Por favor, verifique o ano da data de nascimento informada."
            );
        }
    }
}
