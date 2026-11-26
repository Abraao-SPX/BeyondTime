package br.com.beyondtime.chat.config;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import br.com.beyondtime.shared.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Configuration
@EnableWebSocketMessageBroker
public class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketConfig.class);
    private static final Set<String> ALLOWED_SEND_DESTINATIONS = Set.of(
            "/app/chat.send",
            "/app/chat.read"
    );
    private static final Set<String> ALLOWED_SUBSCRIBE_DESTINATIONS = Set.of(
            "/user/queue/messages",
            "/user/queue/read-receipts",
            "/user/queue/errors"
    );

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final String[] allowedOrigins;

    public ChatWebSocketConfig(
            JwtService jwtService,
            UserRepository userRepository,
            @Value("${beyondtime.security.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:8081,http://localhost:8085,http://127.0.0.1:8085,https://bytime.me,https://www.bytime.me}") String allowedOriginsCsv) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.allowedOrigins = Arrays.stream(allowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue", "/topic");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat")
                .setAllowedOrigins(allowedOrigins);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
        // Frames STOMP carregam apenas texto cifrado ou metadados leves de mídia (mídia binária vai via HTTP)
        registry.setMessageSizeLimit(128 * 1024);
        registry.setSendBufferSizeLimit(512 * 1024);
        registry.setSendTimeLimit(15_000);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(createSecurityChannelInterceptor());
    }

    ChannelInterceptor createSecurityChannelInterceptor() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }

                StompCommand command = accessor.getCommand();
                if (StompCommand.CONNECT.equals(command)) {
                    String token = extractBearerToken(accessor);
                    if (token == null || token.isBlank()) {
                        log.warn("[BeyondTime Chat STOMP] Conexão rejeitada: header Authorization ausente.");
                        throw new IllegalArgumentException("Autenticação JWT obrigatória para conectar ao chat.");
                    }
                    AuthenticatedUser user;
                    try {
                        user = jwtService.parseAccessToken(token);
                    } catch (Exception ex) {
                        log.warn("[BeyondTime Chat STOMP] Conexão rejeitada: JWT inválido.");
                        throw new IllegalArgumentException("Token JWT inválido ou expirado para conexão STOMP.");
                    }
                    boolean active = userRepository.findById(user.userId())
                            .map(User::isActive)
                            .orElse(false);
                    if (!active) {
                        log.warn("[BeyondTime Chat STOMP] Conexão rejeitada: usuário inativo ou excluído.");
                        throw new IllegalArgumentException("Conta inativa ou excluída não pode conectar ao chat.");
                    }
                    accessor.setUser(new StompUserPrincipal(user.userId(), user.email()));
                    return message;
                }

                if (StompCommand.SEND.equals(command)) {
                    if (accessor.getUser() == null) {
                        throw new IllegalArgumentException("Usuário não autenticado para envio STOMP.");
                    }
                    String destination = accessor.getDestination();
                    if (destination == null || !ALLOWED_SEND_DESTINATIONS.contains(destination)) {
                        log.warn("[BeyondTime Chat STOMP] SEND rejeitado para destino não permitido: {}", destination);
                        throw new IllegalArgumentException("Destino STOMP de envio não permitido.");
                    }
                    return message;
                }

                if (StompCommand.SUBSCRIBE.equals(command)) {
                    if (accessor.getUser() == null) {
                        throw new IllegalArgumentException("Usuário não autenticado para assinatura STOMP.");
                    }
                    String destination = accessor.getDestination();
                    if (destination == null || !ALLOWED_SUBSCRIBE_DESTINATIONS.contains(destination)) {
                        log.warn("[BeyondTime Chat STOMP] SUBSCRIBE rejeitado para destino não permitido: {}", destination);
                        throw new IllegalArgumentException("Destino STOMP de assinatura não permitido.");
                    }
                    return message;
                }

                return message;
            }
        };
    }

    private String extractBearerToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            authHeaders = accessor.getNativeHeader("authorization");
        }
        if (authHeaders == null || authHeaders.isEmpty()) {
            return null;
        }
        String raw = authHeaders.get(0);
        if (raw == null) {
            return null;
        }
        if (raw.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return raw.substring(7).trim();
        }
        return raw.trim();
    }
}
