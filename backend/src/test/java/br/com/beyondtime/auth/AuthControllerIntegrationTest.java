package br.com.beyondtime.auth;

import br.com.beyondtime.auth.domain.LgpdDataRequest;
import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import br.com.beyondtime.auth.dto.AuthResponse;
import br.com.beyondtime.auth.dto.ChangePasswordRequest;
import br.com.beyondtime.auth.dto.DeleteAccountRequest;
import br.com.beyondtime.auth.dto.ForgotPasswordRequest;
import br.com.beyondtime.auth.dto.ForgotPasswordResponse;
import br.com.beyondtime.auth.dto.GoogleLoginRequest;
import br.com.beyondtime.auth.dto.LoginRequest;
import br.com.beyondtime.auth.dto.LogoutRequest;
import br.com.beyondtime.auth.dto.RefreshTokenRequest;
import br.com.beyondtime.auth.dto.RegisterRequest;
import br.com.beyondtime.auth.dto.ResetPasswordRequest;
import br.com.beyondtime.auth.dto.VerifyResetCodeRequest;
import br.com.beyondtime.auth.repository.LgpdDataRequestRepository;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.shared.security.LoginRateLimitFilter;
import br.com.beyondtime.shared.util.AgeValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "beyondtime.security.password-reset.expose-debug-code=true")
@AutoConfigureMockMvc
@Transactional
class AuthControllerIntegrationTest {

    private static final long ONE_YEAR_IN_SECONDS = 365L * 24 * 60 * 60;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LgpdDataRequestRepository lgpdDataRequestRepository;

    @Autowired
    private LoginRateLimitFilter loginRateLimitFilter;

    @BeforeEach
    void clearRateLimitBuckets() {
        loginRateLimitFilter.clearBuckets();
    }

    @Test
    void shouldBlockRegistrationWhenUserIsUnder50YearsOld() throws Exception {
        RegisterRequest under50Request = new RegisterRequest(
                "jovem@beyondtime.com.br",
                "79999990001",
                "SenhaSegura123!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(49).minusMonths(11)
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
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(64)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(valid50PlusRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("helena.aracaju@beyondtime.com.br")))
                .andExpect(jsonPath("$.age", is(64)))
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.expiresInSeconds", is(900)))
                .andExpect(jsonPath("$.refreshExpiresInSeconds", is((int) ONE_YEAR_IN_SECONDS)))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authResponse.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("helena.aracaju@beyondtime.com.br")))
                .andExpect(jsonPath("$.role", is("USER")));

        LoginRequest loginRequest = new LoginRequest(
                "helena.aracaju@beyondtime.com.br",
                "HelenaSergipe2026!"
        );

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshExpiresInSeconds", is((int) ONE_YEAR_IN_SECONDS)));

        RefreshTokenRequest refreshRequest = new RefreshTokenRequest(authResponse.refreshToken());
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.refreshExpiresInSeconds", is((int) ONE_YEAR_IN_SECONDS)))
                .andReturn();

        AuthResponse rotatedAuth = objectMapper.readValue(
                refreshResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(rotatedAuth.refreshToken()).isNotEqualTo(authResponse.refreshToken());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("EXPIRED_OR_REVOKED_REFRESH_TOKEN")));

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + rotatedAuth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LogoutRequest(rotatedAuth.refreshToken()))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(rotatedAuth.refreshToken()))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRecoverPasswordWithAssortedAlphanumericCodeAndRevokeActiveRefreshTokens() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "antonio.atalaia@beyondtime.com.br",
                "79988776655",
                "SenhaAntiga2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(71)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse initialAuth = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        MvcResult forgotResult = mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest("antonio.atalaia@beyondtime.com.br"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresInSeconds", is(900)))
                .andExpect(jsonPath("$.debugResetCode", notNullValue()))
                .andReturn();

        ForgotPasswordResponse forgotResponse = objectMapper.readValue(
                forgotResult.getResponse().getContentAsString(), ForgotPasswordResponse.class);
        String assortedCode = forgotResponse.debugResetCode();
        assertThat(assortedCode).matches("^[0-9A-Z]{6}$");

        mockMvc.perform(post("/api/v1/auth/verify-reset-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyResetCodeRequest(
                                "antonio.atalaia@beyondtime.com.br",
                                assortedCode.toLowerCase(Locale.ROOT)
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid", is(true)));

        ResetPasswordRequest resetRequest = new ResetPasswordRequest(
                "antonio.atalaia@beyondtime.com.br",
                assortedCode,
                "NovaSenhaForte2026!",
                "NovaSenhaForte2026!"
        );

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPasswordRequest(
                                "antonio.atalaia@beyondtime.com.br",
                                assortedCode,
                                "OutraSenha2026!",
                                "OutraSenha2026!"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("INVALID_OR_EXPIRED_RESET_CODE")));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(initialAuth.refreshToken()))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_REFRESH_TOKEN")));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("antonio.atalaia@beyondtime.com.br", "SenhaAntiga2026!"))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("antonio.atalaia@beyondtime.com.br", "NovaSenhaForte2026!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()));
    }

    @Test
    void shouldInvalidateResetCodeAfterFiveFailedBruteForceAttempts() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "roberto.coroa@beyondtime.com.br",
                "79981234567",
                "RobertoSenha123!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(66)
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        MvcResult forgotResult = mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest("roberto.coroa@beyondtime.com.br"))))
                .andExpect(status().isOk())
                .andReturn();

        ForgotPasswordResponse forgotResponse = objectMapper.readValue(
                forgotResult.getResponse().getContentAsString(), ForgotPasswordResponse.class);
        String validCode = forgotResponse.debugResetCode();
        String wrongCode = validCode.equals("ZZZZZZ") ? "000000" : "ZZZZZZ";

        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/v1/auth/verify-reset-code")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new VerifyResetCodeRequest("roberto.coroa@beyondtime.com.br", wrongCode))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("INVALID_OR_EXPIRED_RESET_CODE")));
        }

        mockMvc.perform(post("/api/v1/auth/verify-reset-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyResetCodeRequest("roberto.coroa@beyondtime.com.br", wrongCode))))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code", is("TOO_MANY_RESET_CODE_ATTEMPTS")));

        mockMvc.perform(post("/api/v1/auth/verify-reset-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VerifyResetCodeRequest("roberto.coroa@beyondtime.com.br", validCode))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("INVALID_OR_EXPIRED_RESET_CODE")));
    }

    @Test
    void shouldBlockJwtAccessImmediatelyWhenUserAccountIsSuspended() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "suspenso.teste@beyondtime.com.br",
                "79981119999",
                "SenhaValida2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(60)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        User user = userRepository.findById(auth.userId()).orElseThrow();
        user.setStatus(UserStatus.SUSPENDED_PREVENTIVE);
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")));
    }

    @Test
    void shouldNotEnumerateNonExistentEmailsOnForgotPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest("naoexiste@beyondtime.com.br"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresInSeconds", is(900)))
                .andExpect(jsonPath("$.debugResetCode").doesNotExist());
    }

    @Test
    void shouldChangePasswordWhenAuthenticatedAndRevokePreviousRefreshTokens() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "clara.jardins@beyondtime.com.br",
                "79991112233",
                "ClaraInicial123!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(58)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        ChangePasswordRequest changeRequest = new ChangePasswordRequest(
                "ClaraInicial123!",
                "ClaraNovaSenha2026!",
                "ClaraNovaSenha2026!"
        );

        mockMvc.perform(patch("/api/v1/auth/change-password")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changeRequest)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(auth.refreshToken()))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_REFRESH_TOKEN")));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("clara.jardins@beyondtime.com.br", "ClaraNovaSenha2026!"))))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAuthenticateWithGoogleOAuth2AndEnforce50PlusRule() throws Exception {
        GoogleLoginRequest googleUnder50 = new GoogleLoginRequest(
                "google-uid-12345",
                "novo.google@beyondtime.com.br",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(42)
        );

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(googleUnder50)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("UNDER_MINIMUM_AGE_50")));

        GoogleLoginRequest googleValid50Plus = new GoogleLoginRequest(
                "google-uid-67890",
                "marcos.sergipe@beyondtime.com.br",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(68)
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

    @Test
    void shouldEnforceStrongPasswordPolicyAndAcceptDotCommaAndAtSpecialCharacters() throws Exception {
        String[] weakPasswords = {
                "semmaiuscula1!",
                "SEMMINUSCULA1!",
                "SemNumeroAqui!",
                "SemCaractereEspecial123",
                "Com Espaco123!",
                "Cur1!"
        };

        for (String weakPassword : weakPasswords) {
            RegisterRequest invalidReq = new RegisterRequest(
                    "teste.senha@beyondtime.com.br",
                    null,
                    weakPassword,
                    LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(55)
            );

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidReq)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
        }

        RegisterRequest validWithDotAndComma = new RegisterRequest(
                "maria.ponto@beyondtime.com.br",
                "79991234567",
                "Maria50+,Sergipe.2026@",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(62)
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validWithDotAndComma)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("maria.ponto@beyondtime.com.br")))
                .andExpect(jsonPath("$.accessToken", notNullValue()));
    }

    @Test
    void shouldLockAccountTemporarilyAfterFiveFailedLoginAttempts() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "bloqueio.login@beyondtime.com.br",
                "79991110022",
                "SenhaCorreta2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(61)
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        LoginRequest wrongLogin = new LoginRequest("bloqueio.login@beyondtime.com.br", "SenhaErrada999!");

        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(wrongLogin)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("INVALID_CREDENTIALS")));
        }

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code", is("TOO_MANY_LOGIN_ATTEMPTS")));

        // Mesmo informando a senha correta enquanto bloqueado, deve rejeitar com 429
        LoginRequest correctLogin = new LoginRequest("bloqueio.login@beyondtime.com.br", "SenhaCorreta2026!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code", is("TOO_MANY_LOGIN_ATTEMPTS")));
    }

    @Test
    void shouldDeleteAccountDefinitivelyAndRecordLgpdAuditTrail() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "excluir.conta@beyondtime.com.br",
                "79993334455",
                "ExcluirConta2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(65)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        // Rejeita exclusão com senha incorreta
        mockMvc.perform(delete("/api/v1/auth/account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DeleteAccountRequest("SenhaErrada123!", true))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("INVALID_PASSWORD_FOR_DELETION")));

        // Exclui conta definitivamente com senha correta e confirmação defensiva RF06
        mockMvc.perform(delete("/api/v1/auth/account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DeleteAccountRequest("ExcluirConta2026!", true))))
                .andExpect(status().isNoContent());

        // Verifica bloqueio imediato do JWT
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken()))
                .andExpect(status().isUnauthorized());

        // Verifica anonimização no banco e registro na tabela lgpd_data_requests
        User deletedUser = userRepository.findById(auth.userId()).orElseThrow();
        assertThat(deletedUser.getStatus()).isEqualTo(UserStatus.DELETED);
        assertThat(deletedUser.getPasswordHash()).isNull();
        assertThat(deletedUser.getPhone()).isNull();
        assertThat(deletedUser.getBirthDate()).isEqualTo(LocalDate.of(1900, 1, 1));
        assertThat(deletedUser.getEmail()).startsWith("deleted-");

        var lgpdRequests = lgpdDataRequestRepository.findByUserIdOrderByCreatedAtDesc(auth.userId());
        assertThat(lgpdRequests).hasSize(1);
        LgpdDataRequest auditReq = lgpdRequests.get(0);
        assertThat(auditReq.getRequestType()).isEqualTo("DEFINITIVE_ACCOUNT_DELETION");
        assertThat(auditReq.getStatus()).isEqualTo("COMPLETED");
        assertThat(auditReq.isConfirmedViaDefensiveModal()).isTrue();
    }

    @Test
    void shouldRejectGoogleAccountTakeoverWhenLocalPasswordAccountExistsWithoutGoogleLink() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "local.seguro@beyondtime.com.br",
                "79994445566",
                "SenhaLocal2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(59)
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        GoogleLoginRequest takeoverAttempt = new GoogleLoginRequest(
                "attacker-google-uid-999",
                "local.seguro@beyondtime.com.br",
                null
        );

        mockMvc.perform(post("/api/v1/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(takeoverAttempt)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code", is("OAUTH_ACCOUNT_LINK_REQUIRES_VERIFICATION")));
    }

    @Test
    void shouldRejectAccountDeletionWithoutDefensiveModalConfirmation() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "defensivo.modal@beyondtime.com.br",
                "79995556677",
                "ModalSeguro2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(63)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        mockMvc.perform(delete("/api/v1/auth/account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DeleteAccountRequest("ModalSeguro2026!", false))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/v1/auth/account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + auth.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRevokeAllActiveRefreshTokensWhenRevokedRefreshTokenIsReused() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(
                "reuso.token@beyondtime.com.br",
                "79996667788",
                "TokenSeguro2026!",
                LocalDate.now(AgeValidator.SERGIPE_ZONE).minusYears(67)
        );

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse initialAuth = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);

        MvcResult rotatedResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(initialAuth.refreshToken()))))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse rotatedAuth = objectMapper.readValue(
                rotatedResult.getResponse().getContentAsString(), AuthResponse.class);

        // Reutiliza o refresh token já revogado -> deve revogar toda a família de tokens
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(initialAuth.refreshToken()))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("EXPIRED_OR_REVOKED_REFRESH_TOKEN")));

        // O token rotacionado também deve ter sido revogado defensivamente
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(rotatedAuth.refreshToken()))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code", is("EXPIRED_OR_REVOKED_REFRESH_TOKEN")));
    }
}
