package br.com.beyondtime.chat.repository;

import br.com.beyondtime.chat.domain.EncryptedChatMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EncryptedChatMediaRepository extends JpaRepository<EncryptedChatMedia, UUID> {
}
