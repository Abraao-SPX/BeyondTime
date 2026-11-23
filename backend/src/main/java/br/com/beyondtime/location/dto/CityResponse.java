package br.com.beyondtime.location.dto;

import br.com.beyondtime.location.domain.City;

import java.math.BigDecimal;

public record CityResponse(
        Integer id,
        String name,
        String stateUf,
        boolean metropolitanAracaju,
        BigDecimal latitude,
        BigDecimal longitude
) {
    public static CityResponse fromEntity(City city) {
        return new CityResponse(
                city.getId(),
                city.getName(),
                city.getState().getUf(),
                city.isMetropolitanAracaju(),
                city.getLatitude(),
                city.getLongitude()
        );
    }
}
