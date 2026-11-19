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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Filtro de limitação de taxa (Rate Limiting) por IP de origem para endpoints sensíveis de autenticação
 * (/api/v1/auth/login, /api/v1/auth/register, /api/v1/auth/social, /api/v1/auth/refresh,
 * /api/v1/auth/forgot-password, /api/v1/auth/verify-reset-code, /api/v1/auth/reset-password),
 * prevenindo ataques de força bruta distribuídos e credential stuffing (RF-01).
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_BUCKETS = 10_000;
    private static final int CLEANUP_INTERVAL_MASK = 255;

    private static final Set<String> RATE_LIMITED_POST_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/social",
            "/api/v1/auth/refresh",
            "/api/v1/auth/forgot-password",
            "/api/v1/auth/verify-reset-code",
            "/api/v1/auth/reset-password"
    );

    private final ObjectMapper objectMapper;
    private final int maxRequestsPerMinute;
    private final long windowMillis;
    private final boolean trustForwardedHeaders;
    private final Map<String, Deque<Long>> requestTimestampsByBucket = new ConcurrentHashMap<>();
    private final AtomicInteger requestCounter = new AtomicInteger(0);

    public LoginRateLimitFilter(
            ObjectMapper objectMapper,
            @Value("${beyondtime.security.login.ip-max-requests-per-minute:15}") int maxRequestsPerMinute,
            @Value("${beyondtime.security.login.ip-window-seconds:60}") long windowSeconds,
            @Value("${beyondtime.security.login.trust-forwarded-headers:false}") boolean trustForwardedHeaders) {
        this.objectMapper = objectMapper;
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.windowMillis = Math.max(1L, windowSeconds) * 1000L;
        this.trustForwardedHeaders = trustForwardedHeaders;
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
        return !RATE_LIMITED_POST_PATHS.contains(path);
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

        if ((requestCounter.incrementAndGet() & CLEANUP_INTERVAL_MASK) == 0
                || requestTimestampsByBucket.size() > MAX_BUCKETS) {
            evictExpiredBuckets(cutoff);
        }

        AtomicBoolean rateLimited = new AtomicBoolean(false);
        AtomicInteger currentCount = new AtomicInteger(0);

        requestTimestampsByBucket.compute(bucketKey, (k, deque) -> {
            if (deque == null) {
                deque = new ConcurrentLinkedDeque<>();
            }
            while (!deque.isEmpty() && deque.peekFirst() < cutoff) {
                deque.pollFirst();
            }
            if (deque.size() >= maxRequestsPerMinute) {
                rateLimited.set(true);
            } else {
                deque.addLast(now);
                rateLimited.set(false);
            }
            currentCount.set(deque.size());
            return deque;
        });

        int remaining = Math.max(0, maxRequestsPerMinute - currentCount.get());
        response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerMinute));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

        if (rateLimited.get()) {
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

    private void evictExpiredBuckets(long cutoff) {
        for (String key : requestTimestampsByBucket.keySet()) {
            requestTimestampsByBucket.computeIfPresent(key, (k, deque) -> {
                Long lastTimestamp = deque.peekLast();
                if (lastTimestamp == null || lastTimestamp < cutoff) {
                    return null;
                }
                while (!deque.isEmpty() && deque.peekFirst() < cutoff) {
                    deque.pollFirst();
                }
                return deque.isEmpty() ? null : deque;
            });
        }

        if (requestTimestampsByBucket.size() > MAX_BUCKETS) {
            int excess = requestTimestampsByBucket.size() - MAX_BUCKETS;
            var iterator = requestTimestampsByBucket.keySet().iterator();
            while (excess > 0 && iterator.hasNext()) {
                requestTimestampsByBucket.remove(iterator.next());
                excess--;
            }
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        if (trustForwardedHeaders) {
            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                String[] parts = forwardedFor.split(",");
                for (int i = parts.length - 1; i >= 0; i--) {
                    String candidate = parts[i].trim();
                    if (!candidate.isEmpty()) {
                        return candidate;
                    }
                }
            }
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
