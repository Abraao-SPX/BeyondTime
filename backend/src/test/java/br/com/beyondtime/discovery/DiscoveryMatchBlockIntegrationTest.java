package br.com.beyondtime.discovery;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.shared.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DiscoveryMatchBlockIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User userA;
    private User userB;
    private User userC;
    private String tokenA;
    private String tokenB;
    private String tokenC;

    @BeforeEach
    void setUp() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        userA = createUser("helena-" + suffix + "@beyondtime.test", LocalDate.of(1962, 4, 15));
        userB = createUser("marcos-" + suffix + "@beyondtime.test", LocalDate.of(1960, 8, 22));
        userC = createUser("roberto-" + suffix + "@beyondtime.test", LocalDate.of(1955, 11, 3));

        tokenA = "Bearer " + jwtService.generateAccessToken(userA);
        tokenB = "Bearer " + jwtService.generateAccessToken(userB);
        tokenC = "Bearer " + jwtService.generateAccessToken(userC);

        // User A: Aracaju, Amizade, hobbies [Forró, Caminhada, Jardinagem]
        upsertProfile(tokenA, "Helena Tavares " + suffix, "Aracaju (SE)", "Amizade",
                "Amo caminhar na Orla de Atalaia e dançar forró.",
                List.of("forro-tradicional", "caminhada-orla", "jardinagem"));

        // User B: Aracaju, Amizade, mesmos 3 hobbies -> afinidade máxima com A
        upsertProfile(tokenB, "Marcos Mendonça " + suffix, "Aracaju (SE)", "Amizade",
                "Gosto de caminhadas tranquilas, jardinagem e forró pé-de-serra.",
                List.of("forro-tradicional", "caminhada-orla", "jardinagem"));

        // User C: Lagarto, Relacionamento, apenas 1 hobby em comum (jardinagem) -> afinidade menor
        upsertProfile(tokenC, "Roberto Prado " + suffix, "Lagarto (SE)", "Relacionamento",
                "Valorizo boas conversas e leitura.",
                List.of("jardinagem", "leitura", "fotografia"));
    }

    private User createUser(String email, LocalDate birthDate) {
        User user = new User(email, null, passwordEncoder.encode("SenhaForte123!"), birthDate);
        return userRepository.save(user);
    }

    private void upsertProfile(
            String token,
            String fullName,
            String city,
            String goal,
            String bio,
            List<String> hobbies) throws Exception {
        Map<String, Object> body = Map.of(
                "fullName", fullName,
                "city", city,
                "goal", goal,
                "bio", bio,
                "hobbies", hobbies
        );
        mockMvc.perform(put("/api/v1/profiles/me")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    void deveOrdenarDiscoveryPorAfinidadeAplicarFiltrosGerarMatchMutuoECriarConversaReal() throws Exception {
        // 1. Discovery de userA deve ordenar userB acima de userC
        MvcResult discoveryRes = mockMvc.perform(get("/api/v1/discovery")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode list = objectMapper.readTree(discoveryRes.getResponse().getContentAsString());
        int idxB = -1;
        int idxC = -1;
        int affinityB = -1;
        int affinityC = -1;

        for (int i = 0; i < list.size(); i++) {
            JsonNode item = list.get(i);
            String uid = item.get("userId").asText();
            assertThat(uid).isNotEqualTo(userA.getId().toString());
            if (uid.equals(userB.getId().toString())) {
                idxB = i;
                affinityB = item.get("affinityPercent").asInt();
                assertThat(item.get("sameCity").asBoolean()).isTrue();
                assertThat(item.get("sharedHobbiesCount").asInt()).isEqualTo(3);
            }
            if (uid.equals(userC.getId().toString())) {
                idxC = i;
                affinityC = item.get("affinityPercent").asInt();
                assertThat(item.get("sameCity").asBoolean()).isFalse();
                assertThat(item.get("sharedHobbiesCount").asInt()).isEqualTo(1);
            }
        }

        assertThat(idxB).isGreaterThanOrEqualTo(0);
        assertThat(idxC).isGreaterThan(idxB);
        assertThat(affinityB).isGreaterThan(affinityC);

        // 2. Filtro por cidade Lagarto retorna userC e não retorna userB
        MvcResult lagartoRes = mockMvc.perform(get("/api/v1/discovery")
                        .param("city", "Lagarto")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andReturn();
        String lagartoJson = lagartoRes.getResponse().getContentAsString();
        assertThat(lagartoJson).contains(userC.getId().toString());
        assertThat(lagartoJson).doesNotContain(userB.getId().toString());

        // 3. Filtro por hobby "leitura" retorna userC e não userB
        MvcResult hobbyRes = mockMvc.perform(get("/api/v1/discovery")
                        .param("hobbies", "leitura")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andReturn();
        String hobbyJson = hobbyRes.getResponse().getContentAsString();
        assertThat(hobbyJson).contains(userC.getId().toString());
        assertThat(hobbyJson).doesNotContain(userB.getId().toString());

        // 4. userA dá PASS em userC -> userC some do discovery de userA
        mockMvc.perform(post("/api/v1/matches/pass")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetUserId", userC.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("PASS"))
                .andExpect(jsonPath("$.matched").value(false));

        MvcResult afterPass = mockMvc.perform(get("/api/v1/discovery")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(afterPass.getResponse().getContentAsString()).doesNotContain(userC.getId().toString());

        // 5. userA dá LIKE em userB -> ainda não é mútuo (matched = false)
        mockMvc.perform(post("/api/v1/matches/like")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetUserId", userB.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.action").value("LIKE"))
                .andExpect(jsonPath("$.matched").value(false))
                .andExpect(jsonPath("$.conversationId").doesNotExist());

        // 6. userB dá LIKE em userA -> MATCH MÚTUO! Cria match + conversa real automaticamente
        MvcResult matchRes = mockMvc.perform(post("/api/v1/matches/like")
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetUserId", userA.getId()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matched").value(true))
                .andExpect(jsonPath("$.matchId").exists())
                .andExpect(jsonPath("$.conversationId").exists())
                .andExpect(jsonPath("$.contact.userId").value(userA.getId().toString()))
                .andReturn();

        String conversationId = objectMapper.readTree(matchRes.getResponse().getContentAsString())
                .get("conversationId").asText();

        // 7. Conversa real aparece em GET /api/v1/chat/conversations para ambos e aceita envio de mensagem
        mockMvc.perform(get("/api/v1/chat/conversations")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].conversationId").value(conversationId))
                .andExpect(jsonPath("$[0].contactUserId").value(userB.getId().toString()))
                .andExpect(jsonPath("$[0].affinityPercent").isNumber());

        Map<String, Object> msgPayload = Map.of(
                "conversationId", conversationId,
                "ciphertext", "Y2lwaGVydGV4dF9tYXRjaF9yZWFs",
                "iv", "MTJfYnl0ZXNfaXZfZ2Nt",
                "messageType", "TEXT",
                "senderKeyVersion", 1
        );
        mockMvc.perform(post("/api/v1/chat/conversations/" + conversationId + "/messages")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msgPayload)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/chat/conversations/" + conversationId + "/messages")
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ciphertext").value("Y2lwaGVydGV4dF9tYXRjaF9yZWFs"));

        // 8. RF-08: userA bloqueia userB -> ocultação mútua imediata no chat, matches e discovery
        MvcResult blockRes = mockMvc.perform(post("/api/v1/blocks")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "blockedUserId", userB.getId(),
                                "reason", "Não tenho interesse em continuar",
                                "confirmedViaModal", true
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.blockedUserId").value(userB.getId().toString()))
                .andExpect(jsonPath("$.reason").value("Não tenho interesse em continuar"))
                .andReturn();
        String blockId = objectMapper.readTree(blockRes.getResponse().getContentAsString())
                .get("blockId").asText();

        // Listagem de bloqueados de userA contém userB
        mockMvc.perform(get("/api/v1/blocks")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].blockedUserId").value(userB.getId().toString()));

        // Conversa some para ambos e acesso direto é bloqueado com 403
        mockMvc.perform(get("/api/v1/chat/conversations")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/api/v1/chat/conversations")
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/api/v1/chat/conversations/" + conversationId + "/messages")
                        .header("Authorization", tokenB))
                .andExpect(status().isForbidden());

        // Discovery de userB não mostra userA (ocultação mútua)
        MvcResult discoveryBMutual = mockMvc.perform(get("/api/v1/discovery")
                        .header("Authorization", tokenB))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(discoveryBMutual.getResponse().getContentAsString()).doesNotContain(userA.getId().toString());

        // Anti-IDOR: userB não pode remover o bloqueio criado por userA
        mockMvc.perform(delete("/api/v1/blocks/" + blockId)
                        .header("Authorization", tokenB))
                .andExpect(status().isNotFound());

        // 9. Desbloqueio por userA usando blockedUserId:
        //    conversa antiga NÃO reabre automaticamente, mas userB volta ao discovery de userA
        mockMvc.perform(delete("/api/v1/blocks/" + userB.getId())
                        .header("Authorization", tokenA))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/blocks")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/api/v1/chat/conversations")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        MvcResult discoveryAfterUnblock = mockMvc.perform(get("/api/v1/discovery")
                        .header("Authorization", tokenA))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(discoveryAfterUnblock.getResponse().getContentAsString())
                .contains(userB.getId().toString());
    }

    @Test
    void deveRejeitarAutoBloqueioAutoCurtidaXssERequisicaoSemAutenticacao() throws Exception {
        mockMvc.perform(get("/api/v1/discovery"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/blocks")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("blockedUserId", userA.getId()))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/blocks")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "blockedUserId", userB.getId(),
                                "reason", "<script>alert(1)</script>"
                        ))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/matches/like")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetUserId", userA.getId()))))
                .andExpect(status().isBadRequest());
    }
}
