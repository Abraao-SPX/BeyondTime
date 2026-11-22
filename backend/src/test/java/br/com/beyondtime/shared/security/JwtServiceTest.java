package br.com.beyondtime.shared.security;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String STRONG_SECRET = "super_secure_jwt_secret_with_more_than_32_bytes_2026_test!";

    @Test
    void shouldThrowWhenSecretIsEmptyOrNull() {
        MockEnvironment env = new MockEnvironment();

        assertThatThrownBy(() -> new JwtService(null, 15, 365, env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET_KEY é obrigatória");

        assertThatThrownBy(() -> new JwtService("", 15, 365, env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET_KEY é obrigatória");
    }

    @Test
    void shouldThrowWhenSecretIsShorterThan32Bytes() {
        MockEnvironment env = new MockEnvironment();
        String shortSecret = "curto_menos_de_32_bytes";

        assertThatThrownBy(() -> new JwtService(shortSecret, 15, 365, env))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no mínimo 32 bytes");
    }

    @Test
    void shouldRejectInsecureDefaultSecretInProduction() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("production");

        assertThatThrownBy(() -> new JwtService(JwtService.INSECURE_DEFAULT_SECRET, 15, 365, prodEnv))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET_KEY insegura detectada");
    }

    @Test
    void shouldAcceptInsecureDefaultSecretWhenTestProfileIsActive() {
        MockEnvironment testEnv = new MockEnvironment();
        testEnv.setActiveProfiles("test");

        JwtService jwtService = new JwtService(JwtService.INSECURE_DEFAULT_SECRET, 15, 365, testEnv);
        assertThat(jwtService).isNotNull();
    }

    @Test
    void shouldGenerateAndParseValidTokenWithStrongSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("test");
        JwtService jwtService = new JwtService(STRONG_SECRET, 15, 365, env);

        User user = new User("teste@beyondtime.com.br", null, "hashed_password", LocalDate.of(1960, 5, 20));
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        String token = jwtService.generateAccessToken(user);

        assertThat(token).isNotBlank();
        AuthenticatedUser parsed = jwtService.parseAccessToken(token);
        assertThat(parsed.email()).isEqualTo("teste@beyondtime.com.br");
        assertThat(parsed.role()).isEqualTo(UserRole.USER);
    }
}
