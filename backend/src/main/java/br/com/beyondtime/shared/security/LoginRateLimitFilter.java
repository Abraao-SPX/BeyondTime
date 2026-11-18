package br.com.beyondtime.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Filtro de limitação de taxa (Rate Limiting) por IP de origem para endpoints sensíveis de autenticação
 * (/api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/forgot-password, /api/v1/auth/verify-reset-code),
 * prevenindo ataques de força bruta distribuídos e credential stuffing (RF-01).
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/api/v1/auth/login";
    private static final String FORGOT_PASSWORD_PATH = "/api/v1/auth/forgot-password";
    private static final String VERIFY_RESET_PATH = "/api/v1/auth/verify-reset-code";

    private final ObjectMapper objectMapper;
    private final int maxRequestsPerMinute;
    private final long windowMillis;
    private final Map<String, Deque<Long>> requestTimestampsByBucket = new ConcurrentHashMap<>();

    public LoginRateLimitFilter(
            ObjectMapper objectMapper,
            @Value("${beyondtime.security.login.ip-max-requests-per-minute:15}") int maxRequestsPerMinute,
            @Value("${beyondtime.security.login.ip-window-seconds:60}") long windowSeconds) {
        this.objectMapper = objectMapper;
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.windowMillis = Math.max(1L, windowSeconds) * 1000L;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        if (path == null || path.isEmpty()) {
            path = request.getRequestURI();
        }
        return !LOGIN_PATH.equals(path)
                && !FORGOT_PASSWORD_PATH.equals(path)
                && !VERIFY_RESET_PATH.equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        String path = request.getServletPath() != null && !request.getServletPath().isEmpty()
                ? request.getServletPath()
                : request.getRequestURI();
        String bucketKey = clientIp + ":" + path;

        long now = System.currentTimeMillis();
        long cutoff = now - windowMillis;

        Deque<Long> timestamps = requestTimestampsByBucket.computeIfAbsent(
                bucketKey,
                k -> new ConcurrentLinkedDeque<>()
        );

        boolean rateLimited;
        int currentCount;
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < cutoff) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequestsPerMinute) {
                rateLimited = true;
                currentCount = timestamps.size();
            } else {
                timestamps.addLast(now);
                rateLimited = false;
                currentCount = timestamps.size();
            }
        }

        int remaining = Math.max(0, maxRequestsPerMinute - currentCount);
        response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerMinute));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

        if (rateLimited) {
            long retryAfterSeconds = Math.max(1L, windowMillis / 1000L);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

            ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas seguidas a partir desta conexão. Aguarde "
                            + retryAfterSeconds + " segundos antes de tentar novamente."
            );
            pd.setTitle("Limite de Tentativas Excedido");
            pd.setType(URI.create("https://api.beyondtime.com.br/errors/too-many-requests"));
            pd.setProperty("code", "RATE_LIMIT_EXCEEDED");
            pd.setProperty("retryAfterSeconds", retryAfterSeconds);
            pd.setProperty("timestamp", Instant.now());

            objectMapper.writeValue(response.getOutputStream(), pd);
            return;
        }

        filterChain.doFilter(request, response);
    }

    public void clearBuckets() {
        requestTimestampsByBucket.clear();
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String firstIp = forwardedFor.split(",")[0].trim();
            if (!firstIp.isEmpty()) {
                return firstIp;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
