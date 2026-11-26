package br.com.beyondtime.moderation.service;

import br.com.beyondtime.auth.domain.User;
import br.com.beyondtime.auth.domain.UserStatus;
import br.com.beyondtime.auth.repository.UserRepository;
import br.com.beyondtime.block.dto.CreateBlockRequest;
import br.com.beyondtime.block.service.BlockService;
import br.com.beyondtime.chat.domain.ChatMatch;
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
import br.com.beyondtime.shared.exception.BusinessException;
import br.com.beyondtime.shared.exception.ResourceNotFoundException;
import br.com.beyondtime.shared.util.XssSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * RF-12: Reincidência Anti-Fraude, Denúncia Rápida e Congelamento Cautelar (SUSPENDED_PREVENTIVE).
 * Privacidade E2EE: nunca persiste nem registra o texto das mensagens — apenas metadados verificados.
 */
@Service
public class ModerationService {

    private static final Logger log = LoggerFactory.getLogger(ModerationService.class);

    public static final Set<String> ALLOWED_REASON_CODES = Set.of(
            "MONEY_OR_PIX_REQUEST",
            "FAKE_PROFILE",
            "HARASSMENT",
            "INAPPROPRIATE_CONTENT",
            "SPAM",
            "OTHER"
    );

    private static final int ESCALATED_WARNING_THRESHOLD_IN_CONVERSATION = 2;

    private final AntifraudRiskStrikeRepository strikeRepository;
    private final ModerationReportRepository reportRepository;
    private final EncryptedMessageRepository encryptedMessageRepository;
    private final UserRepository userRepository;
    private final ChatMatchRepository chatMatchRepository;
    private final ConversationRepository conversationRepository;
    private final BlockService blockService;

    private final int autoFreezeMinStrikes;
    private final int autoFreezeMinDistinctVictims;
    private final BigDecimal autoFreezeMinConfidence;
    private final int autoFreezeWindowHours;

    @Autowired
    public ModerationService(
            AntifraudRiskStrikeRepository strikeRepository,
            ModerationReportRepository reportRepository,
            EncryptedMessageRepository encryptedMessageRepository,
            UserRepository userRepository,
            ChatMatchRepository chatMatchRepository,
            ConversationRepository conversationRepository,
            BlockService blockService,
            @Value("${beyondtime.moderation.auto-freeze-min-strikes:3}") int autoFreezeMinStrikes,
            @Value("${beyondtime.moderation.auto-freeze-min-distinct-victims:2}") int autoFreezeMinDistinctVictims,
            @Value("${beyondtime.moderation.auto-freeze-min-confidence:80.0}") double autoFreezeMinConfidence,
            @Value("${beyondtime.moderation.auto-freeze-window-hours:24}") int autoFreezeWindowHours) {
        this.strikeRepository = strikeRepository;
        this.reportRepository = reportRepository;
        this.encryptedMessageRepository = encryptedMessageRepository;
        this.userRepository = userRepository;
        this.chatMatchRepository = chatMatchRepository;
        this.conversationRepository = conversationRepository;
        this.blockService = blockService;
        this.autoFreezeMinStrikes = Math.max(2, autoFreezeMinStrikes);
        this.autoFreezeMinDistinctVictims = Math.max(1, autoFreezeMinDistinctVictims);
        this.autoFreezeMinConfidence = BigDecimal.valueOf(autoFreezeMinConfidence).setScale(2, RoundingMode.HALF_UP);
        this.autoFreezeWindowHours = Math.max(1, autoFreezeWindowHours);
    }

    /**
     * Registra um strike verificado (1 por messageId real de mensagem recebida) e aplica
     * escalonamento progressivo:
     * - 2+ alertas na mesma conversa -> aviso reforçado para a vítima.
     * - 3+ alertas críticos (>= 80% confiança) em >= 2 vítimas distintas na janela de 24h
     *   -> congelamento cautelar imediato (SUSPENDED_PREVENTIVE) + chamado de auditoria.
     */
    @Transactional
    public AntifraudCheckResponse recordVerifiedRiskStrikeAndEscalate(
            UUID currentUserId,
            UUID conversationId,
            UUID messageId,
            AntifraudCheckResponse baseResult) {
        if (baseResult == null || !baseResult.alert() || conversationId == null || messageId == null) {
            return baseResult != null ? baseResult : AntifraudCheckResponse.safe();
        }

        Optional<EncryptedMessage> messageOpt = encryptedMessageRepository.findById(messageId);
        if (messageOpt.isEmpty()) {
            return baseResult;
        }

        EncryptedMessage message = messageOpt.get();
        // Anti-spoofing: somente o destinatário real da mensagem naquela conversa pode registrar strike
        if (!message.getConversationId().equals(conversationId)
                || !message.getRecipientId().equals(currentUserId)
                || message.getSenderId().equals(currentUserId)) {
            return baseResult;
        }

        UUID senderUserId = message.getSenderId();
        BigDecimal confidence = BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, baseResult.confidencePercent())))
                .setScale(2, RoundingMode.HALF_UP);

        if (!strikeRepository.existsByMessageId(messageId)) {
            try {
                strikeRepository.saveAndFlush(new AntifraudRiskStrike(
                        messageId,
                        conversationId,
                        senderUserId,
                        currentUserId,
                        baseResult.riskLabel(),
                        confidence
                ));
            } catch (DataIntegrityViolationException ignored) {
                // Corrida concorrente para o mesmo messageId: mantém idempotência (máx 1 strike/mensagem)
            }
        }

        int strikesInConversation = (int) strikeRepository.countByConversationIdAndSenderUserId(
                conversationId, senderUserId
        );
        boolean escalatedWarning = strikesInConversation >= ESCALATED_WARNING_THRESHOLD_IN_CONVERSATION;

        OffsetDateTime since = OffsetDateTime.now().minusHours(autoFreezeWindowHours);
        long criticalStrikes = strikeRepository.countRecentCriticalStrikes(
                senderUserId, autoFreezeMinConfidence, since
        );
        long distinctVictims = strikeRepository.countDistinctRecipientsWithCriticalStrikes(
                senderUserId, autoFreezeMinConfidence, since
        );

        boolean senderSuspended = false;
        String auditTicketCode = null;

        if (criticalStrikes >= autoFreezeMinStrikes && distinctVictims >= autoFreezeMinDistinctVictims) {
            boolean frozen = applyPreventiveFreezeToAccount(senderUserId);
            senderSuspended = frozen;
            if (frozen || !reportRepository.existsByReportedUserIdAndStatus(senderUserId, "OPEN_AUDIT")) {
                auditTicketCode = generateTicketCode("BT-AUTO");
                String reasonCode = mapRiskLabelToReasonCode(baseResult.riskLabel());
                String summary = String.format(
                        Locale.ROOT,
                        "Congelamento cautelar automático por reincidência crítica (%d alertas >= %.0f%% em %d conversas distintas; último sinal: %s).",
                        criticalStrikes,
                        autoFreezeMinConfidence.doubleValue(),
                        distinctVictims,
                        baseResult.riskLabel()
                );
                reportRepository.save(new ModerationReport(
                        auditTicketCode,
                        currentUserId,
                        senderUserId,
                        conversationId,
                        reasonCode,
                        summary,
                        true
                ));
                log.warn(
                        "[RF-12] Congelamento cautelar automático acionado para usuário {} (ticket={}, strikes={}, vitimas={}).",
                        senderUserId, auditTicketCode, criticalStrikes, distinctVictims
                );
            }
        }

        String title = baseResult.educationalTitle();
        String guidance = baseResult.educationalMessage();
        if (senderSuspended) {
            title = "Conta suspensa preventivamente para sua segurança";
            guidance = "Identificamos reincidência de sinais de golpe deste contato. A conta foi congelada preventivamente para auditoria e não poderá enviar novas mensagens.";
        } else if (escalatedWarning) {
            title = "Atenção redobrada — Anjo da Guarda";
            guidance = guidance + " Detectamos sinais repetidos nesta conversa: recomendamos usar 'Denunciar e bloquear' imediatamente.";
        }

        return new AntifraudCheckResponse(
                true,
                baseResult.riskLabel(),
                baseResult.confidencePercent(),
                title,
                guidance,
                strikesInConversation,
                escalatedWarning,
                senderSuspended,
                auditTicketCode
        );
    }

    /**
     * RF-12: Denúncia Rápida e Congelamento Cautelar acionados pelo usuário.
     */
    @Transactional
    public ModerationReportResponse submitQuickReportAndFreeze(
            UUID reporterUserId,
            CreateModerationReportRequest request) {
        UUID reportedUserId = request.reportedUserId();
        if (reporterUserId.equals(reportedUserId)) {
            throw new BusinessException(
                    "SELF_REPORT_NOT_ALLOWED",
                    "Não é possível denunciar o próprio perfil.",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (!userRepository.existsById(reportedUserId)) {
            throw new ResourceNotFoundException("Usuário", reportedUserId);
        }

        String normalizedReason = request.reasonCode() == null
                ? ""
                : request.reasonCode().trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_REASON_CODES.contains(normalizedReason)) {
            throw new BusinessException(
                    "INVALID_REPORT_REASON",
                    "Motivo de denúncia inválido.",
                    HttpStatus.BAD_REQUEST
            );
        }

        String rawDescription = request.description();
        if (rawDescription != null && XssSanitizer.containsMaliciousScript(rawDescription)) {
            throw new BusinessException(
                    "XSS_PAYLOAD_DETECTED",
                    "Conteúdo não permitido detectado na descrição da denúncia.",
                    HttpStatus.BAD_REQUEST
            );
        }
        String sanitizedDescription = (rawDescription != null && !rawDescription.isBlank())
                ? XssSanitizer.sanitizeSingleLine(rawDescription)
                : null;

        boolean freezeApplied = applyPreventiveFreezeToAccount(reportedUserId);

        String auditTicketCode = generateTicketCode("BT-RF12");
        ModerationReport saved = reportRepository.save(new ModerationReport(
                auditTicketCode,
                reporterUserId,
                reportedUserId,
                request.conversationId(),
                normalizedReason,
                sanitizedDescription,
                freezeApplied
        ));

        boolean alsoBlock = request.alsoBlock() == null || request.alsoBlock();
        boolean blockedApplied = false;
        if (alsoBlock) {
            blockService.blockUser(
                    reporterUserId,
                    new CreateBlockRequest(
                            reportedUserId,
                            "Denúncia registrada (" + auditTicketCode + ")",
                            request.confirmedViaModal() == null || request.confirmedViaModal()
                    )
            );
            blockedApplied = true;
        }

        log.info(
                "[RF-12] Denúncia rápida registrada (ticket={}, freeze={}, blocked={}).",
                auditTicketCode, freezeApplied, blockedApplied
        );

        return ModerationReportResponse.from(saved, blockedApplied);
    }

    @Transactional(readOnly = true)
    public List<ModerationReportResponse> listMyReports(UUID reporterUserId) {
        return reportRepository.findByReporterUserIdOrderByCreatedAtDesc(reporterUserId).stream()
                .map(report -> ModerationReportResponse.from(report, true))
                .toList();
    }

    private boolean applyPreventiveFreezeToAccount(UUID targetUserId) {
        Optional<User> targetOpt = userRepository.findById(targetUserId);
        if (targetOpt.isEmpty()) {
            return false;
        }
        User target = targetOpt.get();
        boolean alreadySuspended = target.getStatus() == UserStatus.SUSPENDED_PREVENTIVE;
        if (target.getStatus() == UserStatus.ACTIVE) {
            target.setStatus(UserStatus.SUSPENDED_PREVENTIVE);
            userRepository.save(target);
        }

        // Congela preventivamente todos os matches e conversas ativos do usuário suspeito
        List<ChatMatch> activeMatches = chatMatchRepository.findActiveMatchesForUser(targetUserId);
        for (ChatMatch match : activeMatches) {
            match.markStatus("FROZEN_PREVENTIVE");
            chatMatchRepository.save(match);
            conversationRepository.findByMatchId(match.getId()).ifPresent(conv -> {
                if ("ACTIVE".equalsIgnoreCase(conv.getStatus())) {
                    conv.markStatus("FROZEN_PREVENTIVE");
                    conversationRepository.save(conv);
                }
            });
        }

        return target.getStatus() == UserStatus.SUSPENDED_PREVENTIVE || alreadySuspended;
    }

    private String generateTicketCode(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String mapRiskLabelToReasonCode(String riskLabel) {
        if (riskLabel == null) {
            return "OTHER";
        }
        return switch (riskLabel.toUpperCase(Locale.ROOT)) {
            case "PEDIDO_DINHEIRO", "EMERGENCIA_FINANCEIRA", "FALSO_INTERMEDIARIO",
                    "INVESTIMENTO_SUSPEITO", "FALSA_DOACAO_HERANCA", "ENCOMENDA_TAXA",
                    "PEDIDO_CREDENCIAL", "SONDAGEM_FINANCEIRA" -> "MONEY_OR_PIX_REQUEST";
            case "AMEACA_EXTORSAO" -> "HARASSMENT";
            case "LINK_MALICIOSO", "MENSAGEM_SUSPEITA" -> "SPAM";
            default -> "OTHER";
        };
    }
}
