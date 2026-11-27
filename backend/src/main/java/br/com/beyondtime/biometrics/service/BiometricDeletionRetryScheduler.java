package br.com.beyondtime.biometrics.service;

import br.com.beyondtime.auth.domain.LgpdDataRequest;
import br.com.beyondtime.auth.repository.LgpdDataRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * SEC-ALTA-02 / RF14 — Worker de retentativa (padrão outbox) para garantir a exclusão
 * definitiva de dados biométricos no microsserviço Python dentro do SLA de 48h da LGPD.
 */
@Component
public class BiometricDeletionRetryScheduler {

    private static final Logger log = LoggerFactory.getLogger(BiometricDeletionRetryScheduler.class);

    private final LgpdDataRequestRepository lgpdDataRequestRepository;
    private final BiometricServiceClient biometricServiceClient;

    public BiometricDeletionRetryScheduler(
            LgpdDataRequestRepository lgpdDataRequestRepository,
            BiometricServiceClient biometricServiceClient) {
        this.lgpdDataRequestRepository = lgpdDataRequestRepository;
        this.biometricServiceClient = biometricServiceClient;
    }

    @Scheduled(fixedDelay = 120_000L, initialDelay = 30_000L)
    @Transactional
    public void retryPendingBiometricDeletions() {
        List<LgpdDataRequest> pending = lgpdDataRequestRepository.findByRequestTypeAndStatus(
                "DEFINITIVE_ACCOUNT_DELETION",
                "PROCESSING"
        );
        if (pending.isEmpty()) {
            return;
        }

        for (LgpdDataRequest request : pending) {
            boolean confirmed = biometricServiceClient.deleteUserBiometrics(request.getUserId());
            if (confirmed) {
                request.markCompleted(OffsetDateTime.now());
                lgpdDataRequestRepository.save(request);
                log.info("[BeyondTime LGPD RF-14 Outbox] Exclusão biométrica pendente concluída para userId={}.",
                        request.getUserId());
            }
        }
    }
}
