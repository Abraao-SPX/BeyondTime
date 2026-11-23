package br.com.beyondtime.location;

import br.com.beyondtime.location.domain.City;
import br.com.beyondtime.location.repository.CityRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LocationControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CityRepository cityRepository;

    @Test
    void shouldReturnSergipeState() throws Exception {
        mockMvc.perform(get("/api/v1/locations/states")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].uf", is("SE")))
                .andExpect(jsonPath("$[0].name", is("Sergipe")));
    }

    @Test
    void shouldReturnEightSergipeCitiesOrderedByMetropolitanRegion() throws Exception {
        mockMvc.perform(get("/api/v1/locations/cities")
                        .param("uf", "SE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(8)))
                .andExpect(jsonPath("$[0].name", is("Aracaju")))
                .andExpect(jsonPath("$[0].metropolitanAracaju", is(true)))
                .andExpect(jsonPath("$[*].name", hasItem("Nossa Senhora do Socorro")))
                .andExpect(jsonPath("$[*].name", hasItem("São Cristóvão")))
                .andExpect(jsonPath("$[*].name", hasItem("Lagarto")));
    }

    @Test
    void shouldReturnFifteenNeighborhoodsForAracaju() throws Exception {
        City aracaju = cityRepository.findByStateUfIgnoreCaseOrderByMetropolitanAracajuDescNameAsc("SE")
                .stream()
                .filter(c -> c.getName().equals("Aracaju"))
                .findFirst()
                .orElseThrow();

        mockMvc.perform(get("/api/v1/locations/cities/{cityId}/neighborhoods", aracaju.getId())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(15)))
                .andExpect(jsonPath("$[*].name", hasItem("Atalaia")))
                .andExpect(jsonPath("$[*].name", hasItem("13 de Julho")))
                .andExpect(jsonPath("$[*].name", hasItem("Jardins")));
    }

    @Test
    void shouldReturnProblemDetailRfc7807WhenCityDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/v1/locations/cities/{cityId}/neighborhoods", 999999)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title", is("Violação de Regra de Negócio")))
                .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")))
                .andExpect(jsonPath("$.status", is(404)));
    }

    @Test
    void shouldReturnFiveSafePublicPlacesInAracaju() throws Exception {
        mockMvc.perform(get("/api/v1/locations/safe-places")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[*].name", hasItem("Parque da Sementeira")))
                .andExpect(jsonPath("$[*].name", hasItem("Orla de Atalaia")))
                .andExpect(jsonPath("$[*].name", hasItem("Museu da Gente Sergipana")));
    }
}
