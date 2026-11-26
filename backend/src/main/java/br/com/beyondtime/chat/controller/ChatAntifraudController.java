package br.com.beyondtime.chat.controller;

import br.com.beyondtime.chat.dto.AntifraudCheckRequest;
import br.com.beyondtime.chat.dto.AntifraudCheckResponse;
import br.com.beyondtime.chat.service.AntifraudProxyService;
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/v1/chat/antifraud")
public class ChatAntifraudController {

    private static final long WINDOW_MILLIS = 60_000L;
    private static final int MAX_BUCKETS = 10_000;
    private static final int CLEANUP_MASK = 255;

    private final AntifraudProxyService antifraudProxyService;
    private final int maxRequestsPerMinute;
    private final Map<UUID, Deque<Long>> requestTimestampsByUser = new ConcurrentHashMap<>();
    private final AtomicInteger requestCounter = new AtomicInteger(0);

    @Autowired
    public ChatAntifraudController(
            AntifraudProxyService antifraudProxyService,
            @Value("${beyondtime.antifraud.rate-limit-per-minute:60}") int maxRequestsPerMinute) {
        this.antifraudProxyService = antifraudProxyService;
        this.maxRequestsPerMinute = Math.max(1, maxRequestsPerMinute);
    }

    @PostMapping("/check")
    public ResponseEntity<AntifraudCheckResponse> checkMessageStateless(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody AntifraudCheckRequest request) {
        if (currentUser == null) {
            throw new BusinessException("UNAUTHORIZED", "Autenticação necessária.", HttpStatus.UNAUTHORIZED);
        }
        enforceRateLimit(currentUser.userId());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(antifraudProxyService.checkStateless(request.text()));
    }

    private void enforceRateLimit(UUID userId) {
        long now = System.currentTimeMillis();
        long cutoff = now - WINDOW_MILLIS;

        if ((requestCounter.incrementAndGet() & CLEANUP_MASK) == 0 || requestTimestampsByUser.size() > MAX_BUCKETS) {
            requestTimestampsByUser.entrySet().removeIf(entry -> {
                Deque<Long> q = entry.getValue();
                while (true) {
                    Long head = q.peekFirst();
                    if (head == null || head > cutoff) break;
                    q.pollFirst();
                }
                return q.isEmpty();
            });
        }

        AtomicBoolean limited = new AtomicBoolean(false);
        requestTimestampsByUser.compute(userId, (key, existing) -> {
            Deque<Long> deque = existing != null ? existing : new ConcurrentLinkedDeque<>();
            while (true) {
                Long head = deque.peekFirst();
                if (head == null || head > cutoff) break;
                deque.pollFirst();
            }
            if (deque.size() >= maxRequestsPerMinute) {
                limited.set(true);
            } else {
                deque.addLast(now);
            }
            return deque;
        });

        if (limited.get()) {
            throw new BusinessException(
                    "ANTIFRAUD_RATE_LIMITED",
                    "Muitas verificações em sequência. Aguarde um instante.",
                    HttpStatus.TOO_MANY_REQUESTS
            );
        }
    }
}
