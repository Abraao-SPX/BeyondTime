package br.com.beyondtime.hobby;

import br.com.beyondtime.hobby.domain.Hobby;
import br.com.beyondtime.hobby.repository.HobbyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HobbyTaxonomyControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private HobbyRepository hobbyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private record RegisteredTestUser(UUID userId, String accessToken) {
    }

    private RegisteredTestUser registerTestUser50Plus() throws Exception {
        String email = "hobby-" + UUID.randomUUID().toString().substring(0, 8) + "@beyondtime.com.br";
        String body = """
                {
                  "email": "%s",
                  "password": "SenhaForte@2026!",
                  "birthDate": "1966-04-12"
                }
                """.formatted(email);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new RegisteredTestUser(
                UUID.fromString(json.get("userId").asText()),
                json.get("accessToken").asText()
        );
    }

    @Test
    void shouldReturnParameterizedCatalogWithAtLeastFourCategoriesAndFourteenHobbies() throws Exception {
        mockMvc.perform(get("/api/v1/hobbies/catalog")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))))
                .andExpect(jsonPath("$[0].slug", is("musica-danca")))
                .andExpect(jsonPath("$[0].hobbies", hasSize(greaterThanOrEqualTo(3))));
    }

    @Test
    void shouldPersistValidSelectionBetweenThreeAndTenHobbies() throws Exception {
        List<Integer> threeHobbyIds = hobbyRepository.findByActiveTrueOrderByCategoryDisplayOrderAscNameAsc()
                .stream()
                .limit(3)
                .map(Hobby::getId)
                .toList();

        RegisteredTestUser user = registerTestUser50Plus();
        String payload = "{\"hobbyIds\":" + threeHobbyIds + "}";

        mockMvc.perform(put("/api/v1/hobbies/users/{userId}/selection", user.userId())
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId", is(user.userId().toString())))
                .andExpect(jsonPath("$.totalSelected", is(3)))
                .andExpect(jsonPath("$.hobbies", hasSize(3)));
    }

    @Test
    void shouldRejectSelectionWithFewerThanThreeHobbiesWithRfc7807ProblemDetail() throws Exception {
        List<Integer> twoHobbyIds = hobbyRepository.findByActiveTrueOrderByCategoryDisplayOrderAscNameAsc()
                .stream()
                .limit(2)
                .map(Hobby::getId)
                .toList();

        RegisteredTestUser user = registerTestUser50Plus();
        String payload = "{\"hobbyIds\":" + twoHobbyIds + "}";

        mockMvc.perform(put("/api/v1/hobbies/users/{userId}/selection", user.userId())
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.status", is(400)));
    }

    @Test
    void shouldRejectSelectionWithMoreThanTenHobbiesWithRfc7807ProblemDetail() throws Exception {
        String elevenIds = hobbyRepository.findByActiveTrueOrderByCategoryDisplayOrderAscNameAsc()
                .stream()
                .limit(11)
                .map(h -> String.valueOf(h.getId()))
                .collect(Collectors.joining(","));

        RegisteredTestUser user = registerTestUser50Plus();
        String payload = "{\"hobbyIds\":[" + elevenIds + "]}";

        mockMvc.perform(put("/api/v1/hobbies/users/{userId}/selection", user.userId())
                        .header("Authorization", "Bearer " + user.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.status", is(400)));
    }
}
