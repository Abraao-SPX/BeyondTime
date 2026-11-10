package br.com.beyondtime.auth;

import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.GoogleLoginRequest;
import br.com.beyondtime.auth.dto.LoginRequest;
import br.com.beyondtime.auth.dto.LogoutRequest;
import br.com.beyondtime.auth.dto.RefreshTokenRequest;
import br.com.beyondtime.auth.dto.RegisterRequest;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldBlockRegistrationWhenUserIsUnder50YearsOld() throws Exception {
        RegisterRequest under50Request = new RegisterRequest(
                "jovem@beyondtime.com.br",
                "79999990001",
                "SenhaSegura123!",
                LocalDate.now().minusYears(49).minusMonths(11)
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(under50Request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("UNDER_MINIMUM_AGE_50")))
                .andExpect(jsonPath("$.detail", is("O BeyondTime é uma plataforma exclusiva para pessoas com 50 anos ou mais.")));
    }

    @Test
    void shouldRegister50PlusUserLoginRefreshAndLogoutSuccessfully() throws Exception {
        RegisterRequest valid50PlusRequest = new RegisterRequest(
                "helena.aracaju@beyondtime.com.br",
                "79999887766",
                "HelenaSergipe2026!",
                LocalDate.now().minusYears(64)
        );

        // 1. Registro (RF01 + RF02)
        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(valid50PlusRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("helena.aracaju@beyondtime.com.br")))
                .andExpect(jsonPath("$.age", is(64)))
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        // 2. Acesso a endpoint protegido com Bearer JWT (/api/v1/auth/me)
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authResponse.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("helena.aracaju@beyondtime.com.br")))
                .andExpect(jsonPath("$.role", is("USER")));

        // 3. Login tradicional com BCrypt
        LoginRequest loginRequest = new LoginRequest(
                "helena.aracaju@beyondtime.com.br",
                "HelenaSergipe2026!"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()));

        // 4. Refresh Token com rotação (antigo é revogado)
        RefreshTokenRequest refreshRequest = new RefreshTokenRequest(authResponse.refreshToken());
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andReturn();

        AuthResponse rotatedAuth = objectMapper.readValue(
                refreshResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(rotatedAuth.refreshToken()).isNotEqualTo(authResponse.refreshToken());

        // Tentar reusar o refresh token antigo já rotacionado deve falhar (401)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("EXPIRED_OR_REVOKED_REFRESH_TOKEN")));

        // 5. Logout revogando o novo refresh token
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + rotatedAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LogoutRequest(rotatedAuth.refreshToken()))))
                .andExpect(status().isNoContent());

        // Tentar usar o refresh token após logout deve falhar (401)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(rotatedAuth.refreshToken()))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldAuthenticateWithGoogleOAuth2AndEnforce50PlusRule() throws Exception {
        GoogleLoginRequest googleUnder50 = new GoogleLoginRequest(
                "google-uid-12345",
                "novo.google@beyondtime.com.br",
                LocalDate.now().minusYears(42)
        );

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(googleUnder50)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("UNDER_MINIMUM_AGE_50")));

        GoogleLoginRequest googleValid50Plus = new GoogleLoginRequest(
                "google-uid-67890",
                "marcos.sergipe@beyondtime.com.br",
                LocalDate.now().minusYears(68)
        );

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(googleValid50Plus)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("marcos.sergipe@beyondtime.com.br")))
                .andExpect(jsonPath("$.age", is(68)))
                .andExpect(jsonPath("$.accessToken", notNullValue()));
    }

    @Test
    void shouldReturn401ProblemDetailWhenAccessingProtectedEndpointWithoutJwt() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")))
                .andExpect(jsonPath("$.status", is(401)));
    }
}
