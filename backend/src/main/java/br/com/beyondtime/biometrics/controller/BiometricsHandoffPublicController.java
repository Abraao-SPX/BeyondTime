package br.com.beyondtime.biometrics.controller;

import br.com.beyondtime.biometrics.dto.BiometricHandoffSessionInfoResponse;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.service.BiometricHandoffService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * RF11 — Endpoints consumidos pelo navegador do celular após escanear o QR Code no PC.
 * Não exige login duplicado no celular: a autorização é garantida pelo token efêmero de 256 bits
 * (TTL 5 min, uso único) combinado com o proxy autenticado server-to-server para o microsserviço Python.
 */
@RestController
@RequestMapping("/api/v1/biometrics/handoff")
public class BiometricsHandoffPublicController {

    private final BiometricHandoffService handoffService;

    public BiometricsHandoffPublicController(BiometricHandoffService handoffService) {
        this.handoffService = handoffService;
    }

    @GetMapping("/{token}")
    public ResponseEntity<BiometricHandoffSessionInfoResponse> getSessionInfo(@PathVariable String token) {
        return ResponseEntity.ok(handoffService.getPublicSessionInfo(token));
    }

    @GetMapping("/{token}/enrollment-status")
    public ResponseEntity<Map<String, Boolean>> getEnrollmentStatus(@PathVariable String token) {
        boolean enrolled = handoffService.isHandoffUserEnrolled(token);
        return ResponseEntity.ok(Map.of("enrolled", enrolled));
    }

    @PostMapping(value = "/{token}/submit-video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VerifyBiometricsResponse> submitHandoffVideo(
            @PathVariable String token,
            @RequestParam("video") MultipartFile video,
            @RequestParam("expected_colors") String expectedColors,
            @RequestParam("session_token") String sessionToken) throws IOException {
        return ResponseEntity.ok(
                handoffService.submitHandoffVideo(
                        token,
                        video.getBytes(),
                        video.getOriginalFilename(),
                        video.getContentType(),
                        expectedColors,
                        sessionToken
                )
        );
    }

    @PostMapping("/{token}/complete")
    public ResponseEntity<VerifyBiometricsResponse> completeHandoff(
            @PathVariable String token,
            @Valid @RequestBody VerifyBiometricsRequest request) {
        return ResponseEntity.ok(handoffService.completeHandoff(token, request));
    }
}
