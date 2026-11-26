package br.com.beyondtime.biometrics;

import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.RegisterRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.repository.VerificationAttemptRepository;
import br.com.beyondtime.profile.domain.Profile;
import br.com.beyondtime.profile.repository.ProfileRepository;
import br.com.beyondtime.shared.util.AgeValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "beyondtime.biometrics.jwt.secret=test_biometric_secret_key_32_bytes_long_12345"
})
class BiometricsVerificationIntegrationTest {

    private static final String SECRET = "test_biometric_secret_key_32_bytes_long_12345";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private VerificationAttemptRepository verificationAttemptRepository;

    private UUID userId;
    private String accessToken;

    @BeforeEach
    void setUp() throws Exception {
        String email = "maria.biometria." + UUID.randomUUID() + "@beyondtime.com.br";
        RegisterRequest registerRequest = new RegisterRequest(
                email,
                "79998887766",
                "SenhaForte50+.2026@",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(62)
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        userId = auth.userId();
        accessToken = auth.accessToken();

        // Cria perfil para o usuário (city_id = 1 da seed de Sergipe / Aracaju)
        Profile testProfile = new Profile(userId, "Maria Santos", "Maria", 1, "Bio de teste 50+");
        profileRepository.save(testProfile);
    }

    private String generateBiometricToken(String sub, boolean verified, Double distance, long expEpoch) throws Exception {
        return generateBiometricToken(sub, verified, distance, expEpoch, "reconhecimento-facil-service", UUID.randomUUID().toString());
    }

    private String generateBiometricToken(String sub, boolean verified, Double distance, long expEpoch, String iss, String jti) throws Exception {
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        java.util.HashMap<String, Object> payload = new java.util.HashMap<>();
        payload.put("sub", sub);
        payload.put("verified", verified);
        payload.put("biometrics_model", "YuNet-SFace");
        payload.put("distance", distance);
        payload.put("threshold", 0.35);
        payload.put("exp", expEpoch);
        if (iss != null) payload.put("iss", iss);
        if (jti != null) payload.put("jti", jti);
        String payloadJson = objectMapper.writeValueAsString(payload);

        String h64 = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
        String p64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] sigBytes = mac.doFinal((h64 + "." + p64).getBytes(StandardCharsets.UTF_8));
        String s64 = Base64.getUrlEncoder().withoutPadding().encodeToString(sigBytes);

        return h64 + "." + p64 + "." + s64;
    }

    @Test
    @DisplayName("Deve conceder Selo de Verificado 50+ com token biométrico válido")
    void shouldGrantBadgeWhenTokenIsValid() throws Exception {
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String validToken = generateBiometricToken(userId.toString(), true, 0.215, exp);

        VerifyBiometricsRequest request = new VerifyBiometricsRequest(validToken);

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.verifiedBadge50plus").value(true))
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));

        Profile updated = profileRepository.findByUserId(userId).orElseThrow();
        assertThat(updated.isVerifiedBadge50plus()).isTrue();
        assertThat(updated.getVerificationStatus()).isEqualTo("VERIFIED");
        assertThat(updated.getVerifiedAt()).isNotNull();

        assertThat(verificationAttemptRepository.findByUserIdOrderByCreatedAtDesc(userId)).isNotEmpty();
    }

    @Test
    @DisplayName("Deve rejeitar token biométrico que pertence a outro usuário")
    void shouldRejectTokenWithMismatchedUserId() throws Exception {
        UUID otherUserId = UUID.randomUUID();
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String tokenOfOther = generateBiometricToken(otherUserId.toString(), true, 0.18, exp);

        VerifyBiometricsRequest request = new VerifyBiometricsRequest(tokenOfOther);

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Deve rejeitar token com assinatura violada")
    void shouldRejectTamperedToken() throws Exception {
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String validToken = generateBiometricToken(userId.toString(), true, 0.20, exp);
        String tamperedToken = validToken.substring(0, validToken.length() - 4) + "XXXX";

        VerifyBiometricsRequest request = new VerifyBiometricsRequest(tamperedToken);

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Deve bloquear replay do mesmo token biométrico (jti duplicado)")
    void shouldRejectReplayedBiometricToken() throws Exception {
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String fixedJti = "jti-replay-test-" + UUID.randomUUID();
        String token = generateBiometricToken(userId.toString(), true, 0.21, exp, "reconhecimento-facil-service", fixedJti);

        VerifyBiometricsRequest request = new VerifyBiometricsRequest(token);

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Deve rejeitar token biométrico com emissor (iss) inválido")
    void shouldRejectInvalidIssuer() throws Exception {
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String token = generateBiometricToken(userId.toString(), true, 0.21, exp, "issuer-desconhecido", UUID.randomUUID().toString());

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyBiometricsRequest(token))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Deve rejeitar token biométrico sem jti")
    void shouldRejectMissingJti() throws Exception {
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String token = generateBiometricToken(userId.toString(), true, 0.21, exp, "reconhecimento-facil-service", null);

        mockMvc.perform(post("/api/v1/profiles/me/verify-biometrics")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyBiometricsRequest(token))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Deve concluir handoff PC -> navegador do celular via QR Code (uso único) e conceder Selo 50+")
    void shouldCompleteQrHandoffEndToEndAndBlockReuse() throws Exception {
        // 1. PC cria sessão efêmera de handoff
        MvcResult createRes = mockMvc.perform(post("/api/v1/profiles/me/biometrics/handoff")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.handoffToken").isNotEmpty())
                .andExpect(jsonPath("$.ttlSeconds").value(300))
                .andReturn();

        String handoffToken = objectMapper.readTree(createRes.getResponse().getContentAsString())
                .get("handoffToken").asText();

        // 2. Celular lê dados mínimos da sessão sem precisar de Bearer JWT
        mockMvc.perform(get("/api/v1/biometrics/handoff/" + handoffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.firstName").value("Maria"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        // 3. PC consulta status antes da conclusão -> PENDING
        mockMvc.perform(get("/api/v1/profiles/me/biometrics/handoff/" + handoffToken + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.verifiedBadge50plus").value(false));

        // 4. Celular envia biometricToken assinado pelo microsserviço Python
        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String biometricToken = generateBiometricToken(userId.toString(), true, 0.19, exp);

        mockMvc.perform(post("/api/v1/biometrics/handoff/" + handoffToken + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyBiometricsRequest(biometricToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.verifiedBadge50plus").value(true));

        // 5. PC consulta status após conclusão -> COMPLETED + selo ativo
        mockMvc.perform(get("/api/v1/profiles/me/biometrics/handoff/" + handoffToken + "/status")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.verifiedBadge50plus").value(true));

        // 6. Tentativa de reutilizar o mesmo QR Code -> 410 Gone
        String anotherToken = generateBiometricToken(userId.toString(), true, 0.20, exp);
        mockMvc.perform(post("/api/v1/biometrics/handoff/" + handoffToken + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyBiometricsRequest(anotherToken))))
                .andExpect(status().isGone());
    }

    @Test
    @DisplayName("Deve bloquear tentativa de concluir handoff com token biométrico de outro usuário")
    void shouldRejectHandoffCompletionForDifferentUser() throws Exception {
        MvcResult createRes = mockMvc.perform(post("/api/v1/profiles/me/biometrics/handoff")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isCreated())
                .andReturn();

        String handoffToken = objectMapper.readTree(createRes.getResponse().getContentAsString())
                .get("handoffToken").asText();

        long exp = Instant.now().plusSeconds(3600).getEpochSecond();
        String otherUserBioToken = generateBiometricToken(UUID.randomUUID().toString(), true, 0.15, exp);

        mockMvc.perform(post("/api/v1/biometrics/handoff/" + handoffToken + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyBiometricsRequest(otherUserBioToken))))
                .andExpect(status().isForbidden());
    }
}
