package br.com.beyondtime.biometrics;

import br.com.beyondtime.biometrics.domain.Profile;
import br.com.beyondtime.biometrics.domain.VerificationStatus;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsRequest;
import br.com.beyondtime.biometrics.dto.VerifyBiometricsResponse;
import br.com.beyondtime.biometrics.repository.ProfileRepository;
import br.com.beyondtime.biometrics.repository.VerificationAttemptRepository;
import br.com.beyondtime.biometrics.service.BiometricsVerificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
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

    @Autowired
    private BiometricsVerificationService verificationService;

    private UUID userId;
    private Profile testProfile;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        // Cria perfil para o usuário (city_id = 1 da seed de Sergipe / Aracaju)
        testProfile = new Profile(userId, "Maria Santos", "Maria", 1);
        testProfile = profileRepository.save(testProfile);
    }

    private String generateBiometricToken(String sub, boolean verified, Double distance, long expEpoch) throws Exception {
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson = objectMapper.writeValueAsString(Map.of(
                "sub", sub,
                "verified", verified,
                "biometrics_model", "YuNet-SFace",
                "distance", distance,
                "threshold", 0.35,
                "exp", expEpoch,
                "iss", "reconhecimento-facil-service"
        ));

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
                        .header("X-User-Id", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.verifiedBadge50plus").value(true))
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));

        Profile updated = profileRepository.findByUserId(userId).orElseThrow();
        assertThat(updated.isVerifiedBadge50plus()).isTrue();
        assertThat(updated.getVerificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
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
                        .header("X-User-Id", userId.toString())
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
                        .header("X-User-Id", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
