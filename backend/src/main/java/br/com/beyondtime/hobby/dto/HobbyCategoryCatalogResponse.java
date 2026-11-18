package br.com.beyondtime.hobby.dto;

import br.com.beyondtime.hobby.domain.HobbyCategory;

import java.util.List;

public record HobbyCategoryCatalogResponse(
        Short id,
        String slug,
        String name,
        Short displayOrder,
        List<HobbyResponse> hobbies
) {
    public static HobbyCategoryCatalogResponse fromEntity(
            HobbyCategory category,
            List<HobbyResponse> hobbies) {
        return new HobbyCategoryCatalogResponse(
                category.getId(),
                category.getSlug(),
                category.getName(),
                category.getDisplayOrder(),
                hobbies
        );
    }
}
