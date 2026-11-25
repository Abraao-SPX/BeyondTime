package br.com.beyondtime.block.controller;

import br.com.beyondtime.block.dto.BlockedContactResponse;
import br.com.beyondtime.block.dto.CreateBlockRequest;
import br.com.beyondtime.block.service.BlockService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/blocks")
public class BlockController {

    private final BlockService blockService;

    public BlockController(BlockService blockService) {
        this.blockService = blockService;
    }

    @PostMapping
    public ResponseEntity<BlockedContactResponse> blockContact(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody CreateBlockRequest request) {
        AuthenticatedUser user = requireAuth(currentUser);
        BlockedContactResponse response = blockService.blockUser(user.userId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<BlockedContactResponse>> listBlockedContacts(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        AuthenticatedUser user = requireAuth(currentUser);
        return ResponseEntity.ok(blockService.listBlockedContacts(user.userId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> unblockContact(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID id) {
        AuthenticatedUser user = requireAuth(currentUser);
        blockService.unblockUser(user.userId(), id);
        return ResponseEntity.noContent().build();
    }

    private AuthenticatedUser requireAuth(AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return currentUser;
    }
}
