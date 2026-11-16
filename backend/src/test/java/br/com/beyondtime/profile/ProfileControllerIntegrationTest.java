package br.com.beyondtime.profile;

import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.RegisterRequest;
import br.com.beyondtime.profile.dto.UpsertProfileRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProfileControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnPublicHobbiesCatalogWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/hobbies")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(15))))
                .andExpect(jsonPath("$[*].code", hasItems("MPB", "FORRO_TRADICIONAL", "DANCA_SALAO")));
    }

    @Test
    void shouldReturn401WhenAccessingProfileWithoutJwt() throws Exception {
        mockMvc.perform(get("/api/v1/profiles/me")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    void shouldCreateUpdateAndRetrieveProfileAndEnforceDistinctHobbies() throws Exception {
        AuthResponse auth = registerUser("jose.sergipe@beyondtime.com.br");

        mockMvc.perform(get("/api/v1/profiles/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken()))
                .andExpect(status().isNotFound());

        // Rejeita hobbies duplicados disfarçados de 3 itens (SEC-02)
        UpsertProfileRequest duplicateHobbiesRequest = new UpsertProfileRequest(
                "José Guilherme",
                "Apaixonado por música e caminhadas na Orla de Atalaia.",
                "Aracaju (SE)",
                List.of("MPB", "MPB", "MPB"),
                "Amizade"
        );

        mockMvc.perform(put("/api/v1/profiles/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateHobbiesRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("INVALID_HOBBIES_COUNT")));

        // Cria perfil válido com 3 hobbies distintos e sanitiza HTML na bio (SEC-10)
        UpsertProfileRequest validRequest = new UpsertProfileRequest(
                "José Guilherme",
                "Gosto de caminhar na Orla <script>alert(1)</script> e ouvir MPB.",
                "Aracaju (SE)",
                List.of("FORRO_TRADICIONAL", "MPB", "CAMINHADA_ORLA"),
                "Amizade"
        );

        mockMvc.perform(put("/api/v1/profiles/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName", is("José Guilherme")))
                .andExpect(jsonPath("$.firstName", is("José")))
                .andExpect(jsonPath("$.city", is("Aracaju (SE)")))
                .andExpect(jsonPath("$.goal", is("Amizade")))
                .andExpect(jsonPath("$.bio", is("Gosto de caminhar na Orla alert(1) e ouvir MPB.")))
                .andExpect(jsonPath("$.hobbies", hasSize(3)));

        // Atualiza perfil existente trocando hobbies e objetivo sem violação de constraint (SEC-03)
        UpsertProfileRequest updateRequest = new UpsertProfileRequest(
                "José Guilherme Silva",
                "Bio atualizada em Sergipe.",
                "Lagarto (SE)",
                List.of("JARDINAGEM", "CULINARIA_REGIONAL", "LEITURA", "JOGOS_TABULEIRO"),
                "Companhia"
        );

        mockMvc.perform(put("/api/v1/profiles/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName", is("José Guilherme Silva")))
                .andExpect(jsonPath("$.city", is("Lagarto (SE)")))
                .andExpect(jsonPath("$.goal", is("Companhia")))
                .andExpect(jsonPath("$.hobbies", hasSize(4)));

        mockMvc.perform(get("/api/v1/profiles/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName", is("José Guilherme Silva")))
                .andExpect(jsonPath("$.city", is("Lagarto (SE)")))
                .andExpect(jsonPath("$.hobbies", hasSize(4)));
    }

    private AuthResponse registerUser(String email) throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                email,
                "79998887766",
                "SenhaForte50+.2026@",
                LocalDate.now().minusYears(60)
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
    }
}
