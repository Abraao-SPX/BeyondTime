package br.com.beyondtime.location.dto;

import br.com.beyondtime.location.domain.State;

public record StateResponse(
        Short id,
        String uf,
        String name
) {
    public static StateResponse fromEntity(State state) {
        return new StateResponse(state.getId(), state.getUf(), state.getName());
    }
}
