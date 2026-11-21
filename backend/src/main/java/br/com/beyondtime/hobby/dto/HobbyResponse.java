package br.com.beyondtime.hobby.dto;

import br.com.beyondtime.hobby.domain.Hobby;

public record HobbyResponse(
        Integer id,
        String slug,
        String name,
        Short categoryId,
        String categorySlug,
        String categoryName,
        boolean active
) {
    public static HobbyResponse fromEntity(Hobby hobby) {
        return new HobbyResponse(
                hobby.getId(),
                hobby.getSlug(),
                hobby.getName(),
                hobby.getCategory().getId(),
                hobby.getCategory().getSlug(),
                hobby.getCategory().getName(),
                hobby.isActive()
        );
    }
}
