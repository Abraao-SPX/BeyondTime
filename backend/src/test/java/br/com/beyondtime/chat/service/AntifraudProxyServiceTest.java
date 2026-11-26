package br.com.beyondtime.chat.service;

import br.com.beyondtime.chat.dto.AntifraudCheckResponse;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AntifraudProxyServiceTest {

    private HttpServer stubServer;

    @AfterEach
    void tearDown() {
        if (stubServer != null) {
            stubServer.stop(0);
            stubServer = null;
        }
    }

    private String startStubMlServer(
            String jsonResponse,
            int statusCode,
            AtomicReference<String> capturedBody,
            AtomicReference<String> capturedToken)
            throws IOException {
        stubServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        stubServer.createContext("/analisar", exchange -> {
            byte[] reqBytes = exchange.getRequestBody().readAllBytes();
            if (capturedBody != null) {
                capturedBody.set(new String(reqBytes, StandardCharsets.UTF_8));
            }
            if (capturedToken != null) {
                capturedToken.set(exchange.getRequestHeaders().getFirst("X-Antifraud-Token"));
            }
            byte[] body = jsonResponse.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(statusCode, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        stubServer.start();
        return "http://127.0.0.1:" + stubServer.getAddress().getPort();
    }

    @Test
    void deveEmitirAlertaEducativoEEnviarTokenInternoQuandoMlDetectaGolpe() throws Exception {
        AtomicReference<String> receivedPayload = new AtomicReference<>();
        AtomicReference<String> receivedToken = new AtomicReference<>();
        String baseUrl = startStubMlServer(
                "{\"intencao\":\"FALSO_INTERMEDIARIO\",\"certeza_percentual\":82.0}",
                200,
                receivedPayload,
                receivedToken
        );

        AntifraudProxyService service = new AntifraudProxyService(baseUrl, 1000, 45.0, "segredo-interno-123");
        AntifraudCheckResponse response = service.checkStateless(
                "Oi mae, troquei de numero, faz um Pix de 800 urgente"
        );

        assertThat(receivedPayload.get()).contains("troquei de numero");
        assertThat(receivedToken.get()).isEqualTo("segredo-interno-123");
        assertThat(response.alert()).isTrue();
        assertThat(response.riskLabel()).isEqualTo("FALSO_INTERMEDIARIO");
        assertThat(response.confidencePercent()).isEqualTo(82.0);
        assertThat(response.educationalTitle()).isEqualTo("Dica de Segurança do Anjo da Guarda");
        assertThat(response.educationalMessage()).contains("Pix");
    }

    @Test
    void deveEmitirOrientacaoEspecificaParaNovasClassesDeRisco() throws Exception {
        String baseUrl = startStubMlServer(
                "{\"intencao\":\"LINK_MALICIOSO\",\"certeza_percentual\":50.18}",
                200,
                null,
                null
        );

        AntifraudProxyService service = new AntifraudProxyService(baseUrl, 1000, 45.0);
        AntifraudCheckResponse response = service.checkStateless(
                "Baixe o AnyDesk para eu cancelar a compra suspeita"
        );

        assertThat(response.alert()).isTrue();
        assertThat(response.riskLabel()).isEqualTo("LINK_MALICIOSO");
        assertThat(response.educationalMessage()).contains("AnyDesk");
    }

    @Test
    void naoDeveAlertarQuandoMensagemForNormalOuAbaixoDoLimiar() throws Exception {
        String baseUrl = startStubMlServer(
                "{\"intencao\":\"NORMAL\",\"certeza_percentual\":87.6}",
                200,
                null,
                null
        );

        AntifraudProxyService service = new AntifraudProxyService(baseUrl, 1000, 45.0);
        AntifraudCheckResponse normalResp = service.checkStateless(
                "Hoje eu fui no banco resolver minha aposentadoria e deu tudo certo"
        );

        assertThat(normalResp.alert()).isFalse();
        assertThat(normalResp.riskLabel()).isEqualTo("NORMAL");
        assertThat(normalResp.educationalMessage()).isNull();
    }

    @Test
    void deveRetornarFallbackSeguroQuandoMlEstiverIndisponivel() {
        AntifraudProxyService service = new AntifraudProxyService("http://127.0.0.1:19999", 250, 45.0);
        AntifraudCheckResponse response = service.checkStateless(
                "Faz um Pix urgente de 500 reais agora"
        );

        assertThat(response.alert()).isFalse();
        assertThat(response.riskLabel()).isEqualTo("NORMAL");
    }
}
