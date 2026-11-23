package br.com.beyondtime.location.dto;

import br.com.beyondtime.location.domain.Neighborhood;

public record NeighborhoodResponse(
        Integer id,
        Integer cityId,
        String name,
        String zone
) {
    public static NeighborhoodResponse fromEntity(Neighborhood neighborhood) {
        return new NeighborhoodResponse(
                neighborhood.getId(),
                neighborhood.getCity().getId(),
                neighborhood.getName(),
                neighborhood.getZone()
        );
    }
}
