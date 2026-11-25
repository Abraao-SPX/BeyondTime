package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.UserChatKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserChatKeyRepository extends JpaRepository<UserChatKey, UUID> {
}
