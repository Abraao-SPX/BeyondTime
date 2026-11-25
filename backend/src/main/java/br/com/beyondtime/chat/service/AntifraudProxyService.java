package br.com.beyondtime.chat.service;

import br.com.beyondtime.chat.dto.AntifraudCheckResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.Set;

/**
 * Proxy stateless em RAM para o microsserviço ml-antifraude (Anjo da Guarda).
 * PRIVACIDADE: nunca persiste o texto em banco de dados e nunca registra o conteúdo em logs.
 */
@Service
public class AntifraudProxyService {

    private static final Logger log = LoggerFactory.getLogger(AntifraudProxyService.class);
    private static final double ALERT_THRESHOLD_PERCENT = 75.0;
    private static final Set<String> SAFE_LABELS = Set.of("NORMAL", "CONVERSA_NORMAL", "SEGURO");

    private final RestClient restClient;

    public AntifraudProxyService(
            @Value("${beyondtime.antifraud.base-url:http://ml-antifraude:8000}") String baseUrl,
            @Value("${beyondtime.antifraud.timeout-ms:600}") int timeoutMs) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public AntifraudCheckResponse checkStateless(String decryptedText) {
        if (decryptedText == null || decryptedText.trim().length() < 6) {
            return AntifraudCheckResponse.safe();
        }

        try {
            JsonNode response = restClient.post()
                    .uri("/analisar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("texto", decryptedText))
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return AntifraudCheckResponse.safe();
            }

            String intencao = response.path("intencao").asText("NORMAL").trim().toUpperCase();
            double certeza = response.path("certeza_percentual").asDouble(0.0);

            if (SAFE_LABELS.contains(intencao) || certeza < ALERT_THRESHOLD_PERCENT) {
                return new AntifraudCheckResponse(false, intencao, certeza, null, null);
            }

            return new AntifraudCheckResponse(
                    true,
                    intencao,
                    certeza,
                    "Dica de Segurança do Anjo da Guarda",
                    buildEducationalGuidance(intencao)
            );
        } catch (Exception ex) {
            // Nunca loga o texto da mensagem e nunca trava o chat em caso de indisponibilidade da ML
            log.debug("[BeyondTime Anjo da Guarda] Microsserviço indisponível ou timeout (fallback silencioso).");
            return AntifraudCheckResponse.safe();
        }
    }

    private String buildEducationalGuidance(String riskLabel) {
        return switch (riskLabel) {
            case "PEDIDO_DINHEIRO", "EMERGENCIA_FINANCEIRA", "FALSO_INTERMEDIARIO" ->
                    "Identificamos um possível pedido financeiro ou de Pix. Por segurança, nunca transfira dinheiro para pessoas que você ainda não conhece pessoalmente.";
            case "PEDIDO_CREDENCIAL" ->
                    "Nunca compartilhe senhas, códigos de SMS, dados bancários ou fotos de documentos pelo chat.";
            case "LINK_MALICIOSO" ->
                    "Cuidado com links externos ou arquivos para baixar. Evite clicar em endereços desconhecidos enviados por conversa.";
            case "INVESTIMENTO_SUSPEITO", "FALSA_DOACAO_HERANCA", "ENCOMENDA_TAXA" ->
                    "Desconfie de promessas de lucro garantido, heranças ou taxas para liberar pacotes. Essas abordagens costumam ser golpes.";
            case "AMEACA_EXTORSAO" ->
                    "Você não precisa ceder a pressões ou ameaças. Você pode bloquear este contato imediatamente e acionar a denúncia.";
            default ->
                    "Atenção: esta mensagem contém sinais que merecem cautela. Proteja seus dados pessoais e financeiros.";
        };
    }
}
