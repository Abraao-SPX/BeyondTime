package br.com.beyondtime.location.dto;

import br.com.beyondtime.location.domain.SafePublicPlace;

public record SafePublicPlaceResponse(
        Integer id,
        Integer cityId,
        String cityName,
        Integer neighborhoodId,
        String neighborhoodName,
        String name,
        String category,
        String description
) {
    public static SafePublicPlaceResponse fromEntity(SafePublicPlace place) {
        return new SafePublicPlaceResponse(
                place.getId(),
                place.getCity().getId(),
                place.getCity().getName(),
                place.getNeighborhood() != null ? place.getNeighborhood().getId() : null,
                place.getNeighborhood() != null ? place.getNeighborhood().getName() : null,
                place.getName(),
                place.getCategory(),
                place.getDescription()
        );
    }
}
