package br.com.beyondtime.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 60;
    private static final Set<String> RATE_LIMITED_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/social",
            "/api/v1/auth/google",
            "/api/v1/auth/register",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/verify-reset-code",
            "/api/v1/auth/reset-password"
    );

    private final ObjectMapper objectMapper;
    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    public LoginRateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (RATE_LIMITED_PATHS.contains(path)) {
            String clientIp = extractClientIp(request);
            long currentMinute = Instant.now().getEpochSecond() / 60;
            String key = clientIp + ":" + currentMinute;

            RequestCounter counter = requestCounts.computeIfAbsent(key, k -> new RequestCounter());
            if (counter.incrementAndGet() > MAX_REQUESTS_PER_MINUTE) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Muitas tentativas de autenticação a partir deste endereço IP. Por favor, aguarde um minuto."
                );
                pd.setTitle("Limite de Requisições Excedido");
                pd.setType(URI.create("https://api.beyondtime.com.br/errors/too-many-requests"));
                pd.setProperty("code", "RATE_LIMIT_EXCEEDED");
                pd.setProperty("timestamp", Instant.now());
                objectMapper.writeValue(response.getOutputStream(), pd);
                return;
            }

            if (requestCounts.size() > 1000) {
                requestCounts.keySet().removeIf(k -> {
                    try {
                        long min = Long.parseLong(k.substring(k.lastIndexOf(':') + 1));
                        return min < currentMinute;
                    } catch (Exception e) {
                        return true;
                    }
                });
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private static class RequestCounter {
        private final AtomicInteger count = new AtomicInteger(0);

        public int incrementAndGet() {
            return count.incrementAndGet();
        }
    }
}
