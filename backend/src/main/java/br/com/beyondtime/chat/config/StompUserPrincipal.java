package br.com.beyondtime.chat.config;

import java.security.Principal;
import java.util.UUID;

public record StompUserPrincipal(UUID userId, String email) implements Principal {

    @Override
    public String getName() {
        return userId.toString();
    }
}
