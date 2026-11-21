package br.com.beyondtime.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class LoginRateLimitFilterTest {

    private LoginRateLimitFilter filter;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        filter = new LoginRateLimitFilter(objectMapper, 15, 60, true);
    }

    @Test
    void shouldIsolateBucketsForDifferentClientsBehindProxyUsingXRealIp() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        // Cliente 1 atinge o limite de 15 requisições
        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setServletPath("/api/v1/auth/login");
            req.setRemoteAddr("172.18.0.2"); // IP do Nginx
            req.addHeader("X-Real-IP", "203.0.113.1"); // IP real do Cliente 1
            MockHttpServletResponse res = new MockHttpServletResponse();

            filter.doFilter(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 16ª requisição do Cliente 1 é bloqueada com 429 Too Many Requests
        MockHttpServletRequest reqBlocked = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqBlocked.setServletPath("/api/v1/auth/login");
        reqBlocked.setRemoteAddr("172.18.0.2");
        reqBlocked.addHeader("X-Real-IP", "203.0.113.1");
        MockHttpServletResponse resBlocked = new MockHttpServletResponse();
        filter.doFilter(reqBlocked, resBlocked, filterChain);

        assertThat(resBlocked.getStatus()).isEqualTo(429);
        assertThat(resBlocked.getHeader("Retry-After")).isNotNull();

        // Cliente 2 com X-Real-IP diferente NÃO é afetado pelo bloqueio do Cliente 1
        MockHttpServletRequest reqClient2 = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqClient2.setServletPath("/api/v1/auth/login");
        reqClient2.setRemoteAddr("172.18.0.2");
        reqClient2.addHeader("X-Real-IP", "203.0.113.2"); // IP real do Cliente 2
        MockHttpServletResponse resClient2 = new MockHttpServletResponse();
        filter.doFilter(reqClient2, resClient2, filterChain);

        assertThat(resClient2.getStatus()).isEqualTo(200);
    }

    @Test
    void shouldExtractFirstIpFromXForwardedForWhenRealIpMissing() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setServletPath("/api/v1/auth/login");
            req.setRemoteAddr("172.18.0.2");
            req.addHeader("X-Forwarded-For", "198.51.100.5, 172.18.0.2");
            MockHttpServletResponse res = new MockHttpServletResponse();

            filter.doFilter(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest reqBlocked = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqBlocked.setServletPath("/api/v1/auth/login");
        reqBlocked.setRemoteAddr("172.18.0.2");
        reqBlocked.addHeader("X-Forwarded-For", "198.51.100.5, 172.18.0.2");
        MockHttpServletResponse resBlocked = new MockHttpServletResponse();
        filter.doFilter(reqBlocked, resBlocked, filterChain);

        assertThat(resBlocked.getStatus()).isEqualTo(429);
    }

    @Test
    void shouldNotFilterGetRequests() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/auth/login");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, filterChain);
        verify(filterChain, times(1)).doFilter(req, res);
    }
}
