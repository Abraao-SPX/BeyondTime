package br.com.beyondtime.chat.service;

import br.com.beyondtime.chat.domain.ChatMessageType;
import br.com.beyondtime.chat.domain.EncryptedChatMedia;
import br.com.beyondtime.chat.dto.ChatMediaUploadResponse;
import br.com.beyondtime.chat.repository.EncryptedChatMediaRepository;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class ChatMediaService {

    private static final Logger log = LoggerFactory.getLogger(ChatMediaService.class);
    private static final long MAX_ENCRYPTED_MEDIA_BYTES = 8L * 1024L * 1024L;

    private final ChatConversationService conversationService;
    private final EncryptedChatMediaRepository mediaRepository;
    private final Path mediaStorageDir;

    public ChatMediaService(
            ChatConversationService conversationService,
            EncryptedChatMediaRepository mediaRepository,
            @Value("${beyondtime.uploads.chat-media-dir:uploads/chat-media}") String chatMediaDir) {
        this.conversationService = conversationService;
        this.mediaRepository = mediaRepository;
        this.mediaStorageDir = Paths.get(chatMediaDir).toAbsolutePath().normalize();
    }

    @Transactional
    public ChatMediaUploadResponse uploadEncryptedMedia(
            UUID uploaderUserId,
            UUID conversationId,
            ChatMessageType mediaType,
            MultipartFile encryptedBlob) {
        conversationService.validateParticipationAndAccess(conversationId, uploaderUserId);

        if (mediaType != ChatMessageType.IMAGE && mediaType != ChatMessageType.AUDIO) {
            throw new BusinessException(
                    "INVALID_MEDIA_TYPE",
                    "Tipo de mídia deve ser IMAGE ou AUDIO.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (encryptedBlob == null || encryptedBlob.isEmpty()) {
            throw new BusinessException(
                    "EMPTY_MEDIA_FILE",
                    "Arquivo cifrado vazio.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (encryptedBlob.getSize() > MAX_ENCRYPTED_MEDIA_BYTES) {
            throw new BusinessException(
                    "MEDIA_TOO_LARGE",
                    "A mídia excede o limite máximo de 8 MB.",
                    HttpStatus.PAYLOAD_TOO_LARGE
            );
        }

        byte[] bytes;
        try {
            bytes = encryptedBlob.getBytes();
        } catch (IOException ex) {
            throw new BusinessException(
                    "MEDIA_READ_ERROR",
                    "Falha ao ler arquivo cifrado enviado.",
                    HttpStatus.BAD_REQUEST
            );
        }

        UUID mediaId = UUID.randomUUID();
        String storageFilename = mediaId + ".enc";

        try {
            Files.createDirectories(mediaStorageDir);
            Path target = resolveSafePath(storageFilename);
            Files.write(target, bytes);
        } catch (IOException ex) {
            log.error("[BeyondTime Chat Media] Falha ao salvar mídia cifrada: {}", ex.getMessage());
            throw new BusinessException(
                    "MEDIA_STORAGE_ERROR",
                    "Não foi possível armazenar a mídia cifrada.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        EncryptedChatMedia saved = mediaRepository.save(new EncryptedChatMedia(
                mediaId,
                conversationId,
                uploaderUserId,
                storageFilename,
                mediaType,
                bytes.length
        ));

        return new ChatMediaUploadResponse(
                saved.getId(),
                saved.getConversationId(),
                saved.getMediaType(),
                saved.getSizeBytes()
        );
    }

    @Transactional(readOnly = true)
    public Resource downloadEncryptedMedia(UUID mediaId, UUID currentUserId) {
        EncryptedChatMedia media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Mídia cifrada", mediaId));

        // Garante que apenas participantes da conversa podem baixar o blob cifrado
        conversationService.validateParticipationAndAccess(media.getConversationId(), currentUserId);

        Path target = resolveSafePath(media.getStorageFilename());
        if (!Files.exists(target)) {
            throw new ResourceNotFoundException("Arquivo de mídia cifrada", mediaId);
        }

        try {
            return new ByteArrayResource(Files.readAllBytes(target));
        } catch (IOException ex) {
            log.error("[BeyondTime Chat Media] Falha ao ler mídia cifrada {}: {}", mediaId, ex.getMessage());
            throw new BusinessException(
                    "MEDIA_DOWNLOAD_ERROR",
                    "Não foi possível carregar a mídia cifrada.",
                    HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    public void deleteEncryptedMediaFilesQuietly(List<String> storageFilenames) {
        if (storageFilenames == null || storageFilenames.isEmpty()) {
            return;
        }
        for (String filename : storageFilenames) {
            if (filename == null || filename.isBlank()) {
                continue;
            }
            try {
                Path target = resolveSafePath(filename);
                Files.deleteIfExists(target);
            } catch (Exception ex) {
                log.warn("[BeyondTime Chat Media] Falha ao remover arquivo cifrado após commit (AUD-011): {}",
                        ex.getClass().getSimpleName());
            }
        }
    }

    private Path resolveSafePath(String filename) {
        Path resolved = mediaStorageDir.resolve(filename).normalize();
        if (!resolved.startsWith(mediaStorageDir)) {
            throw new BusinessException(
                    "INVALID_MEDIA_PATH",
                    "Caminho de mídia inválido.",
                    HttpStatus.BAD_REQUEST
            );
        }
        return resolved;
    }
}
