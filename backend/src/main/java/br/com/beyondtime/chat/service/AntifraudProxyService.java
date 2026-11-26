package br.com.beyondtime.chat.service;

import br.com.beyondtime.chat.dto.AntifraudCheckResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private static final Set<String> SAFE_LABELS = Set.of("NORMAL", "CONVERSA_NORMAL", "SEGURO");

    private final RestClient restClient;
    private final double alertThresholdPercent;
    private final String internalToken;

    public AntifraudProxyService(String baseUrl, int timeoutMs, double alertThresholdPercent) {
        this(baseUrl, timeoutMs, alertThresholdPercent, "");
    }

    @Autowired
    public AntifraudProxyService(
            @Value("${beyondtime.antifraud.base-url:http://127.0.0.1:8001}") String baseUrl,
            @Value("${beyondtime.antifraud.timeout-ms:600}") int timeoutMs,
            @Value("${beyondtime.antifraud.alert-threshold-percent:45.0}") double alertThresholdPercent,
            @Value("${beyondtime.antifraud.internal-token:}") String internalToken) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.alertThresholdPercent = alertThresholdPercent;
        this.internalToken = internalToken == null ? "" : internalToken.trim();
    }

    public AntifraudCheckResponse checkStateless(String decryptedText) {
        if (decryptedText == null || decryptedText.trim().length() < 6) {
            return AntifraudCheckResponse.safe();
        }

        try {
            RestClient.RequestBodySpec requestSpec = restClient.post()
                    .uri("/analisar")
                    .contentType(MediaType.APPLICATION_JSON);
            if (!internalToken.isEmpty()) {
                requestSpec = requestSpec.header("X-Antifraud-Token", internalToken);
            }

            JsonNode response = requestSpec
                    .body(Map.of("texto", decryptedText))
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return AntifraudCheckResponse.safe();
            }

            String intencao = response.path("intencao").asText("NORMAL").trim().toUpperCase();
            double certeza = response.path("certeza_percentual").asDouble(0.0);

            if (SAFE_LABELS.contains(intencao) || certeza < alertThresholdPercent) {
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
                    "Identificamos um possível pedido financeiro ou de Pix. Por segurança, nunca transfira dinheiro sem confirmar por chamada de vídeo ou telefone conhecido.";
            case "PEDIDO_CREDENCIAL" ->
                    "Nunca compartilhe senhas, códigos de SMS, conta gov.br, dados bancários, fotos de documentos ou cartões com terceiros.";
            case "LINK_MALICIOSO" ->
                    "Cuidado com links externos, avisos urgentes do INSS ou pedidos para instalar aplicativos (como AnyDesk/TeamViewer). Evite clicar ou baixar arquivos enviados por conversa.";
            case "INVESTIMENTO_SUSPEITO", "FALSA_DOACAO_HERANCA", "ENCOMENDA_TAXA" ->
                    "Desconfie de lucro garantido, tarefas remuneradas, precatórios ou taxas via Pix para liberar pacotes ou heranças. Essas abordagens costumam ser golpes.";
            case "AMEACA_EXTORSAO" ->
                    "Você não precisa ceder a pressões, urgências ou ameaças. Você pode bloquear este contato imediatamente e acionar a denúncia.";
            case "MENSAGEM_SUSPEITA" ->
                    "Evite levar a conversa para fora do aplicativo com pessoas que você acabou de conhecer e desconfie de palavras disfarçadas para pedir Pix ou dados.";
            case "SUBLIMACAO_MENSAGEM" ->
                    "Desconfie de pedidos para apagar conversas ou esconder o contato da sua família. Conversas seguras não exigem segredo nem pressão emocional.";
            case "SONDAGEM_FINANCEIRA" ->
                    "Proteja sua privacidade: evite informar valores de aposentadoria, margem consignável, limites de cartão ou se você mora sozinho(a).";
            default ->
                    "Atenção: esta mensagem contém sinais que merecem cautela. Proteja seus dados pessoais e financeiros.";
        };
    }
}
