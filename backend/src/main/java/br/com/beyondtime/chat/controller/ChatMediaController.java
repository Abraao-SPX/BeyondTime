package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.domain.ChatMessageType;
import br.com.beyondtime.chat.dto.ChatMediaUploadResponse;
import br.com.beyondtime.chat.service.ChatMediaService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat/media")
public class ChatMediaController {

    private final ChatMediaService mediaService;

    public ChatMediaController(ChatMediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatMediaUploadResponse> uploadEncryptedMedia(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("conversationId") UUID conversationId,
            @RequestParam("mediaType") ChatMessageType mediaType,
            @RequestParam("file") MultipartFile file) {
        AuthenticatedUser user = requireAuth(currentUser);
        ChatMediaUploadResponse response = mediaService.uploadEncryptedMedia(
                user.userId(), conversationId, mediaType, file
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{mediaId}")
    public ResponseEntity<Resource> downloadEncryptedMedia(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID mediaId) {
        AuthenticatedUser user = requireAuth(currentUser);
        Resource resource = mediaService.downloadEncryptedMedia(mediaId, user.userId());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + mediaId + ".enc\"")
                .body(resource);
    }

    private AuthenticatedUser requireAuth(AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return currentUser;
    }
}
