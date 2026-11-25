package br.com.beyondtime.chat.service;

import br.com.beyondtime.chat.domain.ChatMessageType;
import br.com.beyondtime.chat.domain.EncryptedMessage;
import br.com.beyondtime.chat.dto.EncryptedMessageResponse;
import br.com.beyondtime.chat.dto.ReadReceiptEvent;
import br.com.beyondtime.chat.dto.SendEncryptedMessageRequest;
import br.com.beyondtime.chat.repository.ConversationRepository;
import br.com.beyondtime.chat.repository.EncryptedChatMediaRepository;
import br.com.beyondtime.chat.repository.EncryptedMessageRepository;
import br.com.beyondtime.chat.service.ChatConversationService.ConversationParticipants;
import br.com.beyondtime.shared.exception.BusinessException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ChatMessageService {

    private static final int DEFAULT_PAGE_LIMIT = 100;
    private static final int MAX_PAGE_LIMIT = 200;

    private final ChatConversationService conversationService;
    private final EncryptedMessageRepository encryptedMessageRepository;
    private final EncryptedChatMediaRepository encryptedChatMediaRepository;
    private final ConversationRepository conversationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatMessageService(
            ChatConversationService conversationService,
            EncryptedMessageRepository encryptedMessageRepository,
            EncryptedChatMediaRepository encryptedChatMediaRepository,
            ConversationRepository conversationRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.conversationService = conversationService;
        this.encryptedMessageRepository = encryptedMessageRepository;
        this.encryptedChatMediaRepository = encryptedChatMediaRepository;
        this.conversationRepository = conversationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public EncryptedMessageResponse sendEncryptedMessage(UUID senderId, SendEncryptedMessageRequest request) {
        ConversationParticipants participants = conversationService.validateParticipationAndAccess(
                request.conversationId(), senderId
        );

        ChatMessageType type = request.messageType() != null ? request.messageType() : ChatMessageType.TEXT;
        if ((type == ChatMessageType.IMAGE || type == ChatMessageType.AUDIO) && request.mediaId() != null) {
            boolean validMedia = encryptedChatMediaRepository.findById(request.mediaId())
                    .map(media -> media.getConversationId().equals(request.conversationId())
                            && media.getUploaderUserId().equals(senderId))
                    .orElse(false);
            if (!validMedia) {
                throw new BusinessException(
                        "INVALID_CHAT_MEDIA",
                        "Mídia cifrada inválida ou não pertence a esta conversa.",
                        HttpStatus.BAD_REQUEST
                );
            }
        }

        EncryptedMessage entity = new EncryptedMessage(
                participants.conversation().getId(),
                senderId,
                participants.otherUserId(),
                request.ciphertext().trim(),
                request.iv().trim(),
                type,
                request.mediaId(),
                request.mediaIv(),
                request.mediaMimeType(),
                request.mediaDurationSeconds(),
                request.senderKeyVersion() != null ? request.senderKeyVersion() : 1
        );

        EncryptedMessage saved = encryptedMessageRepository.save(entity);
        participants.conversation().touch();
        conversationRepository.save(participants.conversation());

        EncryptedMessageResponse response = EncryptedMessageResponse.from(saved);

        // Entrega em tempo real (< 50ms) para o destinatário e eco para outros dispositivos do remetente
        messagingTemplate.convertAndSendToUser(
                participants.otherUserId().toString(),
                "/queue/messages",
                response
        );
        messagingTemplate.convertAndSendToUser(
                senderId.toString(),
                "/queue/messages",
                response
        );

        return response;
    }

    @Transactional(readOnly = true)
    public List<EncryptedMessageResponse> getConversationMessages(UUID conversationId, UUID currentUserId, int limit) {
        conversationService.validateParticipationAndAccess(conversationId, currentUserId);
        int safeLimit = Math.min(Math.max(limit <= 0 ? DEFAULT_PAGE_LIMIT : limit, 1), MAX_PAGE_LIMIT);
        return encryptedMessageRepository
                .findByConversationIdOrderBySentAtAsc(conversationId, PageRequest.of(0, safeLimit))
                .stream()
                .map(EncryptedMessageResponse::from)
                .toList();
    }

    @Transactional
    public ReadReceiptEvent markConversationAsRead(UUID conversationId, UUID readerUserId) {
        ConversationParticipants participants = conversationService.validateParticipationAndAccess(
                conversationId, readerUserId
        );
        OffsetDateTime now = OffsetDateTime.now();
        int updated = encryptedMessageRepository.markAllAsRead(conversationId, readerUserId, now);

        ReadReceiptEvent event = new ReadReceiptEvent(conversationId, readerUserId, updated, now);
        if (updated > 0) {
            messagingTemplate.convertAndSendToUser(
                    participants.otherUserId().toString(),
                    "/queue/read-receipts",
                    event
            );
        }
        return event;
    }
}
