package br.com.beyondtime.chat.config;

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

@Configuration
@EnableWebSocketMessageBroker
public class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketConfig.class);

    private final JwtService jwtService;
    private final String[] allowedOrigins;

    public ChatWebSocketConfig(
            JwtService jwtService,
            @Value("${beyondtime.security.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:8081,http://localhost:8085,http://127.0.0.1:8085,https://bytime.me,https://www.bytime.me}") String allowedOriginsCsv) {
        this.jwtService = jwtService;
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
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = extractBearerToken(accessor);
                    if (token == null || token.isBlank()) {
                        log.warn("[BeyondTime Chat STOMP] Conexão rejeitada: header Authorization ausente.");
                        throw new IllegalArgumentException("Autenticação JWT obrigatória para conectar ao chat.");
                    }
                    try {
                        AuthenticatedUser user = jwtService.parseAccessToken(token);
                        accessor.setUser(new StompUserPrincipal(user.userId(), user.email()));
                    } catch (Exception ex) {
                        log.warn("[BeyondTime Chat STOMP] Conexão rejeitada: JWT inválido.");
                        throw new IllegalArgumentException("Token JWT inválido ou expirado para conexão STOMP.");
                    }
                }
                return message;
            }
        });
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
