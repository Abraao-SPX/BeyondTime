package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.dto.ConversationSummaryResponse;
import br.com.beyondtime.chat.dto.EncryptedMessageResponse;
import br.com.beyondtime.chat.dto.ReadReceiptEvent;
import br.com.beyondtime.chat.dto.SendEncryptedMessageRequest;
import br.com.beyondtime.chat.service.ChatConversationService;
import br.com.beyondtime.chat.service.ChatMessageService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/conversations")
public class ChatConversationController {

    private final ChatConversationService conversationService;
    private final ChatMessageService messageService;

    public ChatConversationController(
            ChatConversationService conversationService,
            ChatMessageService messageService) {
        this.conversationService = conversationService;
        this.messageService = messageService;
    }

    @GetMapping
    public ResponseEntity<List<ConversationSummaryResponse>> listMyConversations(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(conversationService.listMyConversations(user.userId()));
    }

    @PostMapping("/with/{otherUserId}")
    public ResponseEntity<ConversationSummaryResponse> openOrCreateConversation(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID otherUserId) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(conversationService.openOrCreateConversation(user.userId(), otherUserId));
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<EncryptedMessageResponse>> listEncryptedMessages(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "100") int limit) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(messageService.getConversationMessages(conversationId, user.userId(), limit));
    }

    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<EncryptedMessageResponse> sendEncryptedMessageRest(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendEncryptedMessageRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        if (!conversationId.equals(request.conversationId())) {
            throw new BusinessException(
                    "CONVERSATION_ID_MISMATCH",
                    "conversationId do corpo difere do caminho da requisição.",
                    HttpStatus.BAD_REQUEST
            );
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.sendEncryptedMessage(user.userId(), request));
    }

    @PostMapping("/{conversationId}/read")
    public ResponseEntity<ReadReceiptEvent> markConversationAsRead(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID conversationId) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(messageService.markConversationAsRead(conversationId, user.userId()));
    }

    private AuthenticatedUser requireAuth(AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return currentUser;
    }
}
