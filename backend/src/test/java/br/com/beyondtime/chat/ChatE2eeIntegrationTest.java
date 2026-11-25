package br.com.beyondtime.chat;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.chat.domain.UserChatKey;
import br.com.beyondtime.chat.repository.UserChatKeyRepository;
import br.com.beyondtime.shared.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ChatE2eeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserChatKeyRepository userChatKeyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Value("${beyondtime.biometrics.jwt.secret}")
    private String biometricJwtSecret;

    private User userA;
    private User userB;
    private User userC;
    private String tokenA;
    private String tokenB;
    private String tokenC;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        userA = createUser("maria-" + suffix + "@beyondtime.test", LocalDate.of(1962, 5, 10));
        userB = createUser("joao-" + suffix + "@beyondtime.test", LocalDate.of(1958, 9, 20));
        userC = createUser("terceiro-" + suffix + "@beyondtime.test", LocalDate.of(1965, 3, 15));

        tokenA = "Bearer " + jwtService.generateAccessToken(userA);
        tokenB = "Bearer " + jwtService.generateAccessToken(userB);
        tokenC = "Bearer " + jwtService.generateAccessToken(userC);
    }

    private User createUser(String email, LocalDate birthDate) {
        User user = new User(email, null, passwordEncoder.encode("SenhaForte123!"), birthDate);
        return userRepository.save(user);
    }

    private String signBiometricJwt(String sub, boolean verified, String jti, long expEpochSeconds, String secret)
            throws Exception {
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payloadJson = objectMapper.writeValueAsString(Map.of(
                "sub", sub,
                "verified", verified,
                "biometrics_model", "YuNet-SFace-MiniFASNetV2",
                "jti", jti,
                "exp", expEpochSeconds
        ));
        String headerB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
        String payloadB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String sigB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mac.doFinal((headerB64 + "." + payloadB64).getBytes(StandardCharsets.UTF_8)));

        return headerB64 + "." + payloadB64 + "." + sigB64;
    }

    @Test
    void deveRetornar204QuandoCofreAindaNaoConfiguradoEDestrancarComBiometriaAntiReplay() throws Exception {
        // 1. Antes de configurar cofre, GET /me retorna 204 No Content (zero 404 no console)
        mockMvc.perform(get("/api/v1/chat/keys/me")
                        .header("Authorization", tokenA))
                .andExpect(status().isNoContent());

        // 2. Registra cofre protegido por Reconhecimento Facial (RF-11)
        String rawVaultSecret = "V3ryStr0ngR4nd0m256BitVaultSecretKeyBeyondTime2026==";
        Map<String, Object> biometricVault = Map.of(
                "publicKeyJwk", "{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"BIO_X\",\"y\":\"BIO_Y\"}",
                "encryptedPrivateKey", "ZW5jcnlwdGVkX3ByaXZhdGVfa2V5X2Jpbw==",
                "kdfSalt", "c2FsdF9iaW9fMTIzNDU2Nzg=",
                "kdfIv", "aXZfYmlvXzEyMzQ1Ng==",
                "kdfIterations", 310000,
                "keyAlgorithm", "ECDH-P256",
                "vaultSecret", rawVaultSecret
        );

        mockMvc.perform(put("/api/v1/chat/keys/me/biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(biometricVault)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unlockMode").value("BIOMETRIC"))
                .andExpect(jsonPath("$.vaultSecret").doesNotExist());

        // Garante que no banco o vaultSecret está selado por Envelope Encryption (não em texto claro)
        UserChatKey stored = userChatKeyRepository.findById(userA.getId()).orElseThrow();
        assertThat(stored.getUnlockMode()).isEqualTo("BIOMETRIC");
        assertThat(stored.getSealedVaultSecret()).isNotBlank().isNotEqualTo(rawVaultSecret);
        assertThat(stored.getSealedVaultIv()).isNotBlank();

        // 3. Desbloqueio em novo dispositivo com JWT biométrico válido
        String validJti = "bio-jti-" + UUID.randomUUID();
        String validBioJwt = signBiometricJwt(
                userA.getId().toString(), true, validJti, Instant.now().plusSeconds(60).getEpochSecond(), biometricJwtSecret
        );

        mockMvc.perform(post("/api/v1/chat/keys/me/unlock-biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("biometricToken", validBioJwt))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unlockMode").value("BIOMETRIC"))
                .andExpect(jsonPath("$.vaultSecret").value(rawVaultSecret));

        // 4. Anti-replay: reutilizar o mesmo jti é bloqueado com 409 Conflict
        mockMvc.perform(post("/api/v1/chat/keys/me/unlock-biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("biometricToken", validBioJwt))))
                .andExpect(status().isConflict());

        // 5. Anti-IDOR: token biométrico de outro usuário (userB) usado por userA -> 403 Forbidden
        String otherUserBioJwt = signBiometricJwt(
                userB.getId().toString(), true, "bio-jti-" + UUID.randomUUID(),
                Instant.now().plusSeconds(60).getEpochSecond(), biometricJwtSecret
        );
        mockMvc.perform(post("/api/v1/chat/keys/me/unlock-biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("biometricToken", otherUserBioJwt))))
                .andExpect(status().isForbidden());

        // 6. Assinatura adulterada -> 401 Unauthorized
        String forgedBioJwt = signBiometricJwt(
                userA.getId().toString(), true, "bio-jti-" + UUID.randomUUID(),
                Instant.now().plusSeconds(60).getEpochSecond(), "chave_falsa_de_atacante_com_mais_de_32_bytes_999"
        );
        mockMvc.perform(post("/api/v1/chat/keys/me/unlock-biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("biometricToken", forgedBioJwt))))
                .andExpect(status().isUnauthorized());

        // 7. Token expirado -> 401 Unauthorized
        String expiredBioJwt = signBiometricJwt(
                userA.getId().toString(), true, "bio-jti-" + UUID.randomUUID(),
                Instant.now().minusSeconds(10).getEpochSecond(), biometricJwtSecret
        );
        mockMvc.perform(post("/api/v1/chat/keys/me/unlock-biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("biometricToken", expiredBioJwt))))
                .andExpect(status().isUnauthorized());

        // 8. Prova de vida reprovada (verified=false) -> 400 Bad Request
        String unverifiedBioJwt = signBiometricJwt(
                userA.getId().toString(), false, "bio-jti-" + UUID.randomUUID(),
                Instant.now().plusSeconds(60).getEpochSecond(), biometricJwtSecret
        );
        mockMvc.perform(post("/api/v1/chat/keys/me/unlock-biometric")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("biometricToken", unverifiedBioJwt))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deveRegistrarCofreE2eeEnviarMensagemEMidiaCifradaEBloquearTerceiros() throws Exception {
        // 1. User A registra cofre PIN (plano B / compatibilidade)
        Map<String, Object> vaultA = Map.of(
                "publicKeyJwk", "{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"AAAA\",\"y\":\"BBBB\"}",
                "encryptedPrivateKey", "ZW5jcnlwdGVkX3ByaXZhdGVfa2V5X2E=",
                "kdfSalt", "c2FsdF9hXzEyMzQ1Njc4",
                "kdfIv", "aXZfYV8xMjM0NTY=",
                "kdfIterations", 310000,
                "keyAlgorithm", "ECDH-P256"
        );

        mockMvc.perform(put("/api/v1/chat/keys/me")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(vaultA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keyVersion").value(1))
                .andExpect(jsonPath("$.unlockMode").value("PIN"))
                .andExpect(jsonPath("$.encryptedPrivateKey").value("ZW5jcnlwdGVkX3ByaXZhdGVfa2V5X2E="));

        // 2. User B busca apenas a chave pública de User A (não recebe encryptedPrivateKey)
        mockMvc.perform(get("/api/v1/chat/keys/" + userA.getId())
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicKeyJwk").exists())
                .andExpect(jsonPath("$.encryptedPrivateKey").doesNotExist());

        // 3. User A abre conversa com User B
        MvcResult convResult = mockMvc.perform(post("/api/v1/chat/conversations/with/" + userB.getId())
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.conversationId").exists())
                .andReturn();

        JsonNode convJson = objectMapper.readTree(convResult.getResponse().getContentAsString());
        String conversationId = convJson.get("conversationId").asText();

        // 4. User A faz upload de áudio cifrado (blob opaco)
        MockMultipartFile encryptedAudio = new MockMultipartFile(
                "file",
                "audio.enc",
                MediaType.APPLICATION_OCTET_STREAM_VALUE,
                "BYTES_CIFRADOS_AES_GCM_AUDIO".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult mediaResult = mockMvc.perform(multipart("/api/v1/chat/media")
                        .file(encryptedAudio)
                        .param("conversationId", conversationId)
                        .param("mediaType", "AUDIO")
                        .header("Authorization", tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mediaId").exists())
                .andReturn();

        String mediaId = objectMapper.readTree(mediaResult.getResponse().getContentAsString())
                .get("mediaId").asText();

        // 5. User A envia mensagem cifrada com referência ao áudio cifrado
        Map<String, Object> sendPayload = Map.of(
                "conversationId", conversationId,
                "ciphertext", "Y2lwaGVydGV4dF9lMmVlX2F1ZGlv",
                "iv", "MTJfYnl0ZXNfaXZfZ2Nt",
                "messageType", "AUDIO",
                "mediaId", mediaId,
                "mediaIv", "bWVkaWFfaXZfMTJfYnl0ZXM=",
                "mediaMimeType", "audio/webm",
                "mediaDurationSeconds", 12,
                "senderKeyVersion", 1
        );

        mockMvc.perform(post("/api/v1/chat/conversations/" + conversationId + "/messages")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sendPayload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ciphertext").value("Y2lwaGVydGV4dF9lMmVlX2F1ZGlv"))
                .andExpect(jsonPath("$.mediaId").value(mediaId));

        // 6. User B consegue listar histórico cifrado e baixar o áudio cifrado
        mockMvc.perform(get("/api/v1/chat/conversations/" + conversationId + "/messages")
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ciphertext").value("Y2lwaGVydGV4dF9lMmVlX2F1ZGlv"));

        byte[] downloaded = mockMvc.perform(get("/api/v1/chat/media/" + mediaId)
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsByteArray();
        assertThat(new String(downloaded, StandardCharsets.UTF_8)).isEqualTo("BYTES_CIFRADOS_AES_GCM_AUDIO");

        // 7. Anti-IDOR: User C NÃO pode ler mensagens nem baixar mídia da conversa de A e B
        mockMvc.perform(get("/api/v1/chat/conversations/" + conversationId + "/messages")
                        .header("Authorization", tokenC))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/chat/media/" + mediaId)
                        .header("Authorization", tokenC))
                .andExpect(status().isForbidden());

        // 8. Proxy stateless da ML responde com fallback seguro quando ML está offline
        mockMvc.perform(post("/api/v1/chat/antifraud/check")
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Oi, tudo bem? Vamos tomar um cafe?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alert").value(false));
    }
}
