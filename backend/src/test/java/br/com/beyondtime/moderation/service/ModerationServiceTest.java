package br.com.beyondtime.moderation.service;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.block.dto.CreateBlockRequest;
import br.com.beyondtime.block.service.BlockService;
import br.com.beyondtime.chat.domain.ChatMatch;
import br.com.beyondtime.chat.domain.ChatMessageType;
import br.com.beyondtime.chat.domain.Conversation;
import br.com.beyondtime.chat.domain.EncryptedMessage;
import br.com.beyondtime.chat.dto.AntifraudCheckResponse;
import br.com.beyondtime.chat.repository.ChatMatchRepository;
import br.com.beyondtime.chat.repository.ConversationRepository;
import br.com.beyondtime.chat.repository.EncryptedMessageRepository;
import br.com.beyondtime.moderation.domain.AntifraudRiskStrike;
import br.com.beyondtime.moderation.domain.ModerationReport;
import br.com.beyondtime.moderation.dto.CreateModerationReportRequest;
import br.com.beyondtime.moderation.dto.ModerationReportResponse;
import br.com.beyondtime.moderation.repository.AntifraudRiskStrikeRepository;
import br.com.beyondtime.moderation.repository.ModerationReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ModerationServiceTest {

    @Mock
    private AntifraudRiskStrikeRepository strikeRepository;
    @Mock
    private ModerationReportRepository reportRepository;
    @Mock
    private EncryptedMessageRepository encryptedMessageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ChatMatchRepository chatMatchRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private BlockService blockService;

    private ModerationService moderationService;

    @BeforeEach
    void setUp() {
        moderationService = new ModerationService(
                strikeRepository,
                reportRepository,
                encryptedMessageRepository,
                userRepository,
                chatMatchRepository,
                conversationRepository,
                blockService,
                3,
                2,
                80.0,
                24
        );
    }

    @Test
    void deveIgnorarStrikeQuandoMensagemNaoPertenceAoDestinatarioAntiSpoofing() {
        UUID intruderId = UUID.randomUUID();
        UUID realVictimId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();
        EncryptedMessage msg = new EncryptedMessage(
                convId, senderId, realVictimId, "cipher", "iv",
                ChatMessageType.TEXT, null, null, null, null, 1
        );

        when(encryptedMessageRepository.findById(msg.getId())).thenReturn(Optional.of(msg));

        AntifraudCheckResponse base = new AntifraudCheckResponse(
                true, "PEDIDO_DINHEIRO", 92.0, "Dica", "Mensagem educativa"
        );
        AntifraudCheckResponse result = moderationService.recordVerifiedRiskStrikeAndEscalate(
                intruderId, convId, msg.getId(), base
        );

        assertThat(result.strikeCountInConversation()).isEqualTo(0);
        assertThat(result.senderPreventivelySuspended()).isFalse();
        verify(strikeRepository, never()).saveAndFlush(any());
    }

    @Test
    void deveEscalonarAvisoNoSegundoAlertaNaMesmaConversaSemSuspenderComApenasUmaVitima() {
        UUID victimId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();
        EncryptedMessage msg = new EncryptedMessage(
                convId, senderId, victimId, "cipher", "iv",
                ChatMessageType.TEXT, null, null, null, null, 1
        );

        when(encryptedMessageRepository.findById(msg.getId())).thenReturn(Optional.of(msg));
        when(strikeRepository.existsByMessageId(msg.getId())).thenReturn(false);
        when(strikeRepository.countByConversationIdAndSenderUserId(convId, senderId)).thenReturn(2L);
        when(strikeRepository.countRecentCriticalStrikes(eq(senderId), any(), any())).thenReturn(2L);
        when(strikeRepository.countDistinctRecipientsWithCriticalStrikes(eq(senderId), any(), any())).thenReturn(1L);

        AntifraudCheckResponse base = new AntifraudCheckResponse(
                true, "FALSO_INTERMEDIARIO", 85.0, "Dica", "Nunca faça Pix."
        );
        AntifraudCheckResponse result = moderationService.recordVerifiedRiskStrikeAndEscalate(
                victimId, convId, msg.getId(), base
        );

        verify(strikeRepository).saveAndFlush(any(AntifraudRiskStrike.class));
        assertThat(result.strikeCountInConversation()).isEqualTo(2);
        assertThat(result.escalatedWarning()).isTrue();
        assertThat(result.senderPreventivelySuspended()).isFalse();
        verify(userRepository, never()).save(any());
    }

    @Test
    void deveAcionarCongelamentoCautelarAutomaticoEmReincidenciaCriticaComMultiplasVitimas() {
        UUID victimId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();
        EncryptedMessage msg = new EncryptedMessage(
                convId, senderId, victimId, "cipher", "iv",
                ChatMessageType.TEXT, null, null, null, null, 1
        );
        User scammer = new User("golpista@beyondtime.test", null, "hash", LocalDate.of(1965, 5, 10));
        ChatMatch match = new ChatMatch(senderId, victimId, BigDecimal.valueOf(80.00), (short) 2);
        Conversation conversation = new Conversation(match.getId());

        when(encryptedMessageRepository.findById(msg.getId())).thenReturn(Optional.of(msg));
        when(strikeRepository.existsByMessageId(msg.getId())).thenReturn(false);
        when(strikeRepository.countByConversationIdAndSenderUserId(convId, senderId)).thenReturn(2L);
        when(strikeRepository.countRecentCriticalStrikes(eq(senderId), any(), any())).thenReturn(3L);
        when(strikeRepository.countDistinctRecipientsWithCriticalStrikes(eq(senderId), any(), any())).thenReturn(2L);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(scammer));
        when(chatMatchRepository.findActiveMatchesForUser(senderId)).thenReturn(List.of(match));
        when(conversationRepository.findByMatchId(match.getId())).thenReturn(Optional.of(conversation));

        AntifraudCheckResponse base = new AntifraudCheckResponse(
                true, "PEDIDO_CREDENCIAL", 91.5, "Dica", "Nunca passe senhas."
        );
        AntifraudCheckResponse result = moderationService.recordVerifiedRiskStrikeAndEscalate(
                victimId, convId, msg.getId(), base
        );

        assertThat(scammer.getStatus()).isEqualTo(UserStatus.SUSPENDED_PREVENTIVE);
        assertThat(match.getStatus()).isEqualTo("FROZEN_PREVENTIVE");
        assertThat(conversation.getStatus()).isEqualTo("FROZEN_PREVENTIVE");
        assertThat(result.senderPreventivelySuspended()).isTrue();
        assertThat(result.auditTicketCode()).startsWith("BT-AUTO-");
        verify(reportRepository).save(any(ModerationReport.class));
    }

    @Test
    void deveRegistrarDenunciaRapidaRf12ComCongelamentoCautelarEBloqueio() {
        UUID reporterId = UUID.randomUUID();
        UUID reportedId = UUID.randomUUID();
        UUID convId = UUID.randomUUID();
        User reported = new User("suspeito@beyondtime.test", null, "hash", LocalDate.of(1962, 3, 15));

        when(userRepository.existsById(reportedId)).thenReturn(true);
        when(userRepository.findById(reportedId)).thenReturn(Optional.of(reported));
        when(chatMatchRepository.findActiveMatchesForUser(reportedId)).thenReturn(List.of());
        when(reportRepository.save(any(ModerationReport.class))).thenAnswer(inv -> inv.getArgument(0));

        ModerationReportResponse response = moderationService.submitQuickReportAndFreeze(
                reporterId,
                new CreateModerationReportRequest(
                        reportedId,
                        convId,
                        "MONEY_OR_PIX_REQUEST",
                        "Pediu Pix urgente",
                        true,
                        true
                )
        );

        assertThat(reported.getStatus()).isEqualTo(UserStatus.SUSPENDED_PREVENTIVE);
        assertThat(response.auditTicketCode()).startsWith("BT-RF12-");
        assertThat(response.preventiveFreezeApplied()).isTrue();
        assertThat(response.blockedApplied()).isTrue();
        assertThat(response.status()).isEqualTo("OPEN_AUDIT");

        ArgumentCaptor<CreateBlockRequest> blockCaptor = ArgumentCaptor.forClass(CreateBlockRequest.class);
        verify(blockService).blockUser(eq(reporterId), blockCaptor.capture());
        assertThat(blockCaptor.getValue().blockedUserId()).isEqualTo(reportedId);
    }
}
