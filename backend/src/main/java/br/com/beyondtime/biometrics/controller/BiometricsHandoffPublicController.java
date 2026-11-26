package br.com.beyondtime.biometrics.controller;

import br.com.beyondtime.biometrics.dto.BiometricHandoffSessionInfoResponse;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.service.BiometricHandoffService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * RF11 — Endpoints consumidos pelo navegador do celular após escanear o QR Code no PC.
 * Não exige login duplicado no celular: a autorização é garantida pelo token efêmero de 256 bits
 * (TTL 5 min, uso único) combinado com o JWT biométrico assinado pelo microsserviço Python.
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

    @PostMapping("/{token}/complete")
    public ResponseEntity<VerifyBiometricsResponse> completeHandoff(
            @PathVariable String token,
            @Valid @RequestBody VerifyBiometricsRequest request) {
        return ResponseEntity.ok(handoffService.completeHandoff(token, request));
    }
}
