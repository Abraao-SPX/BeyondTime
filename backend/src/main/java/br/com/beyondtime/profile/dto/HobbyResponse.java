package br.com.beyondtime.profile.dto;

import br.com.beyondtime.profile.domain.Hobby;

public record HobbyResponse(
        Integer id,
        String code,
        String name,
        String icon
) {
    public static HobbyResponse from(Hobby hobby) {
        return new HobbyResponse(
                hobby.getId(),
                hobby.getCode(),
                hobby.getName(),
                hobby.getIcon()
        );
    }
}
