package br.com.beyondtime.chat.config;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.shared.security.AuthenticatedUser;
import br.com.beyondtime.shared.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatWebSocketSecurityInterceptorTest {

    private JwtService jwtService;
    private UserRepository userRepository;
    private ChannelInterceptor interceptor;
    private MessageChannel channel;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        userRepository = mock(UserRepository.class);
        ChatWebSocketConfig config = new ChatWebSocketConfig(jwtService, userRepository, "http://localhost:5173");
        interceptor = config.createSecurityChannelInterceptor();
        channel = mock(MessageChannel.class);
    }

    @Test
    void deveRecusarConnectParaUsuarioDeletedOuSuspenso() {
        User deletedUser = new User("del@beyondtime.test", null, "hash", LocalDate.of(1960, 1, 1));
        deletedUser.anonymizeAndMarkDeleted(OffsetDateTime.now());
        when(jwtService.parseAccessToken("tok-del"))
                .thenReturn(new AuthenticatedUser(deletedUser.getId(), deletedUser.getEmail(), "USER"));
        when(userRepository.findById(deletedUser.getId())).thenReturn(Optional.of(deletedUser));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer tok-del");
        accessor.setLeaveMutable(true);
        Message<byte[]> msg = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(msg, channel))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inativa");

        User suspendedUser = new User("susp@beyondtime.test", null, "hash", LocalDate.of(1960, 1, 1));
        suspendedUser.setStatus(UserStatus.SUSPENDED_PREVENTIVE);
        when(jwtService.parseAccessToken("tok-susp"))
                .thenReturn(new AuthenticatedUser(suspendedUser.getId(), suspendedUser.getEmail(), "USER"));
        when(userRepository.findById(suspendedUser.getId())).thenReturn(Optional.of(suspendedUser));

        StompHeaderAccessor suspAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        suspAccessor.addNativeHeader("Authorization", "Bearer tok-susp");
        suspAccessor.setLeaveMutable(true);
        Message<byte[]> suspMsg = MessageBuilder.createMessage(new byte[0], suspAccessor.getMessageHeaders());

        assertThatThrownBy(() -> interceptor.preSend(suspMsg, channel))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deveAceitarConnectParaUsuarioAtivoEPermitirApenasDestinosAutorizados() {
        User activeUser = new User("ativo@beyondtime.test", null, "hash", LocalDate.of(1960, 1, 1));
        when(jwtService.parseAccessToken("tok-ok"))
                .thenReturn(new AuthenticatedUser(activeUser.getId(), activeUser.getEmail(), "USER"));
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        StompHeaderAccessor connectAcc = StompHeaderAccessor.create(StompCommand.CONNECT);
        connectAcc.addNativeHeader("Authorization", "Bearer tok-ok");
        connectAcc.setLeaveMutable(true);
        Message<byte[]> connectMsg = MessageBuilder.createMessage(new byte[0], connectAcc.getMessageHeaders());

        interceptor.preSend(connectMsg, channel);
        assertThat(connectAcc.getUser()).isInstanceOf(StompUserPrincipal.class);

        StompUserPrincipal principal = (StompUserPrincipal) connectAcc.getUser();

        // SUBSCRIBE permitido
        assertThat(interceptor.preSend(buildFrame(StompCommand.SUBSCRIBE, "/user/queue/messages", principal), channel))
                .isNotNull();
        assertThat(interceptor.preSend(buildFrame(StompCommand.SUBSCRIBE, "/user/queue/read-receipts", principal), channel))
                .isNotNull();

        // SUBSCRIBE proibido (outro usuário ou tópico arbitrário)
        assertThatThrownBy(() -> interceptor.preSend(
                buildFrame(StompCommand.SUBSCRIBE, "/user/" + UUID.randomUUID() + "/queue/messages", principal), channel))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> interceptor.preSend(
                buildFrame(StompCommand.SUBSCRIBE, "/topic/global", principal), channel))
                .isInstanceOf(IllegalArgumentException.class);

        // SEND permitido vs proibido
        assertThat(interceptor.preSend(buildFrame(StompCommand.SEND, "/app/chat.send", principal), channel))
                .isNotNull();
        assertThat(interceptor.preSend(buildFrame(StompCommand.SEND, "/app/chat.read", principal), channel))
                .isNotNull();
        assertThatThrownBy(() -> interceptor.preSend(
                buildFrame(StompCommand.SEND, "/topic/spam", principal), channel))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private Message<byte[]> buildFrame(StompCommand command, String destination, StompUserPrincipal principal) {
        StompHeaderAccessor acc = StompHeaderAccessor.create(command);
        acc.setDestination(destination);
        acc.setUser(principal);
        acc.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], acc.getMessageHeaders());
    }
}
