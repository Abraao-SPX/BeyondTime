package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.config.StompUserPrincipal;
import br.com.beyondtime.chat.dto.MarkReadRequest;
import br.com.beyondtime.chat.dto.SendEncryptedMessageRequest;
import br.com.beyondtime.chat.service.ChatMessageService;
import br.com.beyondtime.shared.exception.BusinessException;
import jakarta.validation.Valid;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;
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

    @MessageExceptionHandler(BusinessException.class)
    @SendToUser("/queue/errors")
    public Map<String, Object> handleBusinessException(BusinessException ex) {
        return Map.of(
                "code", ex.getCode(),
                "detail", ex.getMessage(),
                "status", ex.getStatus().value(),
                "timestamp", Instant.now().toString()
        );
    }

    @MessageExceptionHandler({MethodArgumentNotValidException.class, IllegalArgumentException.class})
    @SendToUser("/queue/errors")
    public Map<String, Object> handleValidationException(Exception ex) {
        return Map.of(
                "code", "INVALID_STOMP_PAYLOAD",
                "detail", "Não foi possível enviar sua mensagem. Verifique os dados e tente novamente.",
                "status", 400,
                "timestamp", Instant.now().toString()
        );
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
