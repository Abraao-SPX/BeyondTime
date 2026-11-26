"""
Testes de integração ponta a ponta da ML Anti-Fraude (Anjo da Guarda) com o contrato do Chat.

Valida:
1. Saúde da API (/health) e verificação criptográfica SHA-256 do modelo_anjo.joblib.
2. Autenticação interna via X-Antifraud-Token (HTTP 401 sem/com token inválido, 200 com token válido).
3. Privacidade: zero eco do texto na resposta JSON e cabeçalho Cache-Control: no-store.
4. Classificação e latência (< 50ms por mensagem) em cenários reais de chat (todas as 13 classes).
5. Contrato exato do AntifraudProxyService.java (threshold 45%, SAFE_LABELS e alertas educativos).
6. Zero falsos positivos em mensagens normais e hard negatives (banco, INSS, Pix legítimo, família).
7. Validação HTTP 422 para entradas vazias ou > 4000 caracteres e resiliência do fallback heurístico.
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HOST = "127.0.0.1"
PORT = 18001
BASE_URL = f"http://{HOST}:{PORT}"
ALERT_THRESHOLD_PERCENT = 45.0
SAFE_LABELS = {"NORMAL", "CONVERSA_NORMAL", "SEGURO"}
TEST_INTERNAL_TOKEN = "segredo-interno-teste-antifraude-2026"


def http_json(method: str, path: str, payload=None, extra_headers=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        method=method,
        headers=headers,
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            return resp.status, json.loads(resp.read().decode("utf-8")), dict(resp.headers), elapsed_ms
    except urllib.error.HTTPError as err:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        body = err.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return err.code, parsed, dict(err.headers), elapsed_ms


def wait_for_server(timeout_s: float = 15.0):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            status, body, _, _ = http_json("GET", "/health")
            if status == 200 and body.get("status") == "ok":
                return body
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("Servidor uvicorn da ML Anti-Fraude não subiu a tempo.")


def simulate_backend_proxy_decision(ml_response: dict) -> dict:
    """Replica exatamente o contrato do AntifraudProxyService.java."""
    intencao = str(ml_response.get("intencao", "NORMAL")).strip().upper()
    certeza = float(ml_response.get("certeza_percentual", 0.0))
    alert = (intencao not in SAFE_LABELS) and (certeza >= ALERT_THRESHOLD_PERCENT)
    return {
        "alert": alert,
        "riskLabel": intencao,
        "confidencePercent": certeza,
    }


def main():
    env = os.environ.copy()
    env["ANTIFRAUD_INTERNAL_TOKEN"] = TEST_INTERNAL_TOKEN

    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api:app", "--host", HOST, "--port", str(PORT)],
        cwd=BASE_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    auth_headers = {"X-Antifraud-Token": TEST_INTERNAL_TOKEN}

    try:
        health = wait_for_server()
        print("1. [OK] GET /health:", health["modo_ativo"], "| sha256_verificado:", health["detalhes"]["sha256_verificado"])
        assert health["modo_ativo"] == "modelo_ia", f"Esperado modelo_ia, obtido: {health}"
        assert health["modelo_carregado"] is True
        assert health["detalhes"]["sha256_verificado"] is True

        # 2. Autenticação interna obrigatória (X-Antifraud-Token)
        st_no_tok, _, _, _ = http_json("POST", "/analisar", {"texto": "Faz um Pix urgente de 500 reais"})
        assert st_no_tok == 401, f"Esperado 401 sem token, obtido {st_no_tok}"
        st_bad_tok, _, _, _ = http_json(
            "POST", "/analisar", {"texto": "Faz um Pix urgente de 500 reais"}, {"X-Antifraud-Token": "token-errado"}
        )
        assert st_bad_tok == 401, f"Esperado 401 com token inválido, obtido {st_bad_tok}"
        print("2. [OK] Autenticação interna X-Antifraud-Token validada (401 sem/com token inválido).")

        # 3. Cenários reais de chat (mensagens recebidas -> proxy -> card do Anjo da Guarda)
        casos_chat = [
            ("Bom dia querida, vamos tomar um café na praça no sábado?", False, "NORMAL"),
            ("Hoje fui pessoalmente no banco resolver meu extrato do INSS e deu tudo certo", False, "NORMAL"),
            ("Meu neto passou na faculdade hoje, estou tão feliz!", False, "NORMAL"),
            ("Paguei o almoço no restaurante com Pix na maquininha e voltei pra casa", False, "NORMAL"),
            ("Oi mãe, troquei de número, salva esse aqui. Faz um Pix de R$ 800 pra pagar um boleto hoje?", True, "FALSO_INTERMEDIARIO"),
            ("Baixe o aplicativo AnyDesk no seu celular para eu cancelar a compra suspeita na sua conta", True, "LINK_MALICIOSO"),
            ("INSS AVISO: Pendência na sua Prova de Vida. Seu benefício será bloqueado em 24h: https://meuinss-provadevida-gov.online", True, "LINK_MALICIOSO"),
            ("Aqui é da central de segurança do banco, confirme sua senha e o token para cancelar a compra de R$ 2.500", True, "PEDIDO_CREDENCIAL"),
            ("Seu cartão foi clonado, corte o cartão sem danificar o chip e entregue junto com a senha pro motoboy do banco", True, "PEDIDO_CREDENCIAL"),
            ("Olá, aqui é do escritório de advocacia, seu precatório de R$ 48.000 foi liberado! Pague as custas no Pix", True, "FALSA_DOACAO_HERANCA"),
            ("Olá, somos da Shopee! Ganhe R$ 300 por dia curtindo vídeos no TikTok e fazendo tarefas VIP", True, "INVESTIMENTO_SUSPEITO"),
            ("CORREIOS: Seu objeto foi taxado na alfândega de Curitiba, pague a guia no Pix hoje", True, "ENCOMENDA_TAXA"),
            ("Oi, fiz um Pix errado de R$ 400 na sua conta, devolve nessa outra chave aqui urgente!", True, "PEDIDO_DINHEIRO"),
            ("Vamos sair desse aplicativo e conversar no WhatsApp porque aqui tem muita fiscalização", True, "MENSAGEM_SUSPEITA"),
            ("Apaga essa nossa conversa do celular para seus filhos não verem nada", True, "SUBLIMACAO_MENSAGEM"),
            ("Sou o delegado da delegacia e a viatura vai parar na sua casa se não pagar a fiança", True, "AMEACA_EXTORSAO"),
            ("Alô mãe, socorro! Bati o carro na estrada, faz um Pix pro guincho agora!", True, "EMERGENCIA_FINANCEIRA"),
            ("Você mora em casa própria ou paga aluguel? Já usou sua margem consignável do INSS?", True, "SONDAGEM_FINANCEIRA"),
        ]

        latencias = []
        print("\n3. Testando fluxo Chat -> Proxy Backend (limiar 45%) -> ML /analisar:")
        for texto, espera_alerta, classe_esperada in casos_chat:
            status, body, resp_headers, elapsed_ms = http_json("POST", "/analisar", {"texto": texto}, auth_headers)
            assert status == 200, f"HTTP {status} para '{texto}': {body}"
            # Privacidade: nenhum eco de texto na resposta + Cache-Control: no-store
            assert set(body.keys()) == {"intencao", "certeza_percentual"}, f"Eco inesperado na resposta: {body}"
            cache_ctrl = resp_headers.get("cache-control") or resp_headers.get("Cache-Control") or ""
            assert "no-store" in cache_ctrl.lower(), f"Header Cache-Control ausente: {resp_headers}"
            latencias.append(elapsed_ms)

            decisao = simulate_backend_proxy_decision(body)
            ok_alerta = decisao["alert"] == espera_alerta
            ok_classe = decisao["riskLabel"] == classe_esperada
            marcador = "OK" if (ok_alerta and ok_classe) else "FALHA"
            print(
                f"   [{marcador}] alert={str(decisao['alert']):5s} | "
                f"{decisao['riskLabel']:22s} ({decisao['confidencePercent']:5.1f}%) | "
                f"{elapsed_ms:5.1f}ms | {texto[:62]}"
            )
            assert ok_alerta, f"Alerta incorreto para '{texto}': {decisao}"
            assert ok_classe, f"Classe incorreta para '{texto}': esperado {classe_esperada}, obtido {decisao}"

        media_ms = sum(latencias) / len(latencias)
        max_ms = max(latencias)
        print(f"\n4. [OK] Privacidade (zero eco + Cache-Control: no-store) e latência ({media_ms:.1f}ms média / {max_ms:.1f}ms máx) validadas.")
        assert media_ms < 50.0, f"Latência média acima de 50ms: {media_ms:.1f}ms"

        # 5. Validações de entrada HTTP 422
        status_empty, _, _, _ = http_json("POST", "/analisar", {"texto": "   "}, auth_headers)
        assert status_empty == 422, f"Esperado 422 para texto em branco, obtido {status_empty}"
        status_long, _, _, _ = http_json("POST", "/analisar", {"texto": "a" * 4001}, auth_headers)
        assert status_long == 422, f"Esperado 422 para texto > 4000 chars, obtido {status_long}"
        print("5. [OK] Validação HTTP 422 (texto vazio e > 4000 chars) validada.")

        # 6. Fallback heurístico direto (com acentos)
        sys.path.insert(0, BASE_DIR)
        import api  # noqa: E402

        fb_anydesk = api.analisar_heuristico(api.limpar_texto("Baixe o AnyDesk agora"))
        fb_mae = api.analisar_heuristico(api.limpar_texto("Oi mãe, troquei de número"))
        fb_prec = api.analisar_heuristico(api.limpar_texto("Seu precatório foi liberado, pague as custas no Pix"))
        assert fb_anydesk[0] == "LINK_MALICIOSO", fb_anydesk
        assert fb_mae[0] == "FALSO_INTERMEDIARIO", fb_mae
        assert fb_prec[0] == "FALSA_DOACAO_HERANCA", fb_prec
        print("6. [OK] Fallback heurístico defensivo validado (AnyDesk, Falso Parente, Precatório).")

        print("\n=== TODOS OS TESTES DE INTEGRAÇÃO E HARDENING CHAT <-> ML PASSARAM! ===")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    main()
