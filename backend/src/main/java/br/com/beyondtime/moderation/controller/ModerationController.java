package br.com.beyondtime.moderation.controller;

import br.com.beyondtime.moderation.dto.CreateModerationReportRequest;
import br.com.beyondtime.moderation.dto.ModerationReportResponse;
import br.com.beyondtime.moderation.service.ModerationService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/moderation/reports")
public class ModerationController {

    private final ModerationService moderationService;

    public ModerationController(ModerationService moderationService) {
        this.moderationService = moderationService;
    }

    @PostMapping
    public ResponseEntity<ModerationReportResponse> createReport(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody CreateModerationReportRequest request) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        ModerationReportResponse created = moderationService.submitQuickReportAndFreeze(
                currentUser.userId(),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/me")
    public ResponseEntity<List<ModerationReportResponse>> listMyReports(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        return ResponseEntity.ok(moderationService.listMyReports(currentUser.userId()));
    }
}
