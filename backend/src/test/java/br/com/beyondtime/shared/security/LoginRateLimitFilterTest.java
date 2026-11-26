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
        filter = new LoginRateLimitFilter(objectMapper, 15, 60, true, "172.18.0.2,127.0.0.1");
    }

    @Test
    void shouldIgnoreSpoofedHeadersWhenTrustForwardedDisabledOrProxyUntrusted() throws ServletException, IOException {
        LoginRateLimitFilter strictFilter = new LoginRateLimitFilter(objectMapper, 15, 60, false, "172.18.0.2");
        FilterChain filterChain = mock(FilterChain.class);

        // Atacante tenta variar X-Real-IP e X-Forwarded-For a cada tentativa, mas continua limitado pelo remoteAddr real
        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setServletPath("/api/v1/auth/login");
            req.setRemoteAddr("198.51.100.99");
            req.addHeader("X-Real-IP", "10.0.0." + i);
            req.addHeader("X-Forwarded-For", "10.1.0." + i);
            MockHttpServletResponse res = new MockHttpServletResponse();
            strictFilter.doFilter(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest req16 = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        req16.setServletPath("/api/v1/auth/login");
        req16.setRemoteAddr("198.51.100.99");
        req16.addHeader("X-Real-IP", "10.99.99.99");
        MockHttpServletResponse res16 = new MockHttpServletResponse();
        strictFilter.doFilter(req16, res16, filterChain);
        assertThat(res16.getStatus()).isEqualTo(429);
    }

    @Test
    void shouldUseRightmostUntrustedIpFromXForwardedForBehindTrustedProxy() throws ServletException, IOException {
        FilterChain filterChain = mock(FilterChain.class);

        // Atacante forja o IP à esquerda em X-Forwarded-For, mas o proxy confiável (172.18.0.2) anexa 198.51.100.55 à direita
        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setServletPath("/api/v1/auth/login");
            req.setRemoteAddr("172.18.0.2");
            req.addHeader("X-Forwarded-For", "203.0.113." + i + ", 198.51.100.55, 172.18.0.2");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest reqBlocked = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqBlocked.setServletPath("/api/v1/auth/login");
        reqBlocked.setRemoteAddr("172.18.0.2");
        reqBlocked.addHeader("X-Forwarded-For", "203.0.113.250, 198.51.100.55, 172.18.0.2");
        MockHttpServletResponse resBlocked = new MockHttpServletResponse();
        filter.doFilter(reqBlocked, resBlocked, filterChain);
        assertThat(resBlocked.getStatus()).isEqualTo(429);
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
    void shouldMatchTrustedProxiesUsingCidrRangesForDockerBridgeNetwork() throws ServletException, IOException {
        LoginRateLimitFilter cidrFilter = new LoginRateLimitFilter(
                objectMapper,
                15,
                60,
                true,
                "127.0.0.1/32,::1/128,172.16.0.0/12,10.0.0.0/8,192.168.0.0/16"
        );
        FilterChain filterChain = mock(FilterChain.class);

        for (int i = 0; i < 15; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setServletPath("/api/v1/auth/login");
            req.setRemoteAddr("172.22.0.14"); // IP dinâmico do container Nginx na rede bridge Docker
            req.addHeader("X-Forwarded-For", "198.51.100.77, 172.22.0.14");
            MockHttpServletResponse res = new MockHttpServletResponse();
            cidrFilter.doFilter(req, res, filterChain);
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 16ª requisição do mesmo cliente atrás do CIDR confiável é bloqueada
        MockHttpServletRequest reqBlocked = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqBlocked.setServletPath("/api/v1/auth/login");
        reqBlocked.setRemoteAddr("172.22.0.14");
        reqBlocked.addHeader("X-Forwarded-For", "198.51.100.77, 172.22.0.14");
        MockHttpServletResponse resBlocked = new MockHttpServletResponse();
        cidrFilter.doFilter(reqBlocked, resBlocked, filterChain);
        assertThat(resBlocked.getStatus()).isEqualTo(429);

        // Outro cliente distinto atrás do mesmo proxy CIDR continua liberado
        MockHttpServletRequest reqOther = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqOther.setServletPath("/api/v1/auth/login");
        reqOther.setRemoteAddr("10.88.0.5");
        reqOther.addHeader("X-Forwarded-For", "198.51.100.88");
        MockHttpServletResponse resOther = new MockHttpServletResponse();
        cidrFilter.doFilter(reqOther, resOther, filterChain);
        assertThat(resOther.getStatus()).isEqualTo(200);
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
