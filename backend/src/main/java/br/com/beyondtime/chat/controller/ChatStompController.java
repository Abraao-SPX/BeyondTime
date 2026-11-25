package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.config.StompUserPrincipal;
import br.com.beyondtime.chat.dto.MarkReadRequest;
import br.com.beyondtime.chat.dto.SendEncryptedMessageRequest;
import br.com.beyondtime.chat.service.ChatMessageService;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
public class ChatStompController {

    private final ChatMessageService messageService;

    public ChatStompController(ChatMessageService messageService) {
        this.messageService = messageService;
    }

    @MessageMapping("/chat.send")
    public void sendEncryptedMessage(
            @Valid @Payload SendEncryptedMessageRequest request,
            Principal principal) {
        UUID senderId = extractUserId(principal);
        messageService.sendEncryptedMessage(senderId, request);
    }

    @MessageMapping("/chat.read")
    public void markAsRead(
            @Valid @Payload MarkReadRequest request,
            Principal principal) {
        UUID readerId = extractUserId(principal);
        messageService.markConversationAsRead(request.conversationId(), readerId);
    }

    private UUID extractUserId(Principal principal) {
        if (principal instanceof StompUserPrincipal stompUser) {
            return stompUser.userId();
        }
        if (principal != null && principal.getName() != null) {
            return UUID.fromString(principal.getName());
        }
        throw new IllegalArgumentException("Usuário STOMP não autenticado.");
    }
}
