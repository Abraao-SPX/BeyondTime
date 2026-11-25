import hashlib
import hmac
import html
import logging
import os
import re
from typing import Any, Dict, Optional, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-antifraude")

# 1. Cria a aplicação web
app = FastAPI(title="API Anjo da Guarda - BeyondTime")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELO_PATH = os.environ.get("MODELO_PATH", os.path.join(BASE_DIR, "modelo_anjo.joblib"))
HASH_PATH = os.environ.get("MODELO_HASH_PATH", os.path.join(BASE_DIR, "modelo_anjo.joblib.sha256"))

modelo: Optional[Any] = None
modo_ativo: str = "inicializando"
modelo_info: Dict[str, Any] = {
    "caminho_modelo": MODELO_PATH,
    "caminho_hash": HASH_PATH,
    "sha256_verificado": False,
    "status": "pendente",
}

XSS_OUTPUT_PATTERN = re.compile(
    r"<\s*/?\s*[a-z!]|javascript\s*:|vbscript\s*:|data\s*:\s*text/html|\bon[a-z]{2,30}\s*=",
    re.IGNORECASE,
)


def calcular_sha256(arquivo_path: str) -> str:
    hasher = hashlib.sha256()
    with open(arquivo_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest().lower().strip()


def carregar_modelo_defensivo() -> Tuple[Optional[Any], str, Dict[str, Any]]:
    """Carrega o modelo de IA com verificação criptográfica SHA-256 (SEC-CRIT-03, SEC-MED-03).

    Se o modelo ou seu hash estiverem ausentes, ativa fallback heurístico defensivo
    sem derrubar o servidor.
    Se o hash divergir, recusa a carga por suspeita de adulteração (fail-closed)
    e opera em fallback heurístico com log de erro de segurança.
    """
    info: Dict[str, Any] = {
        "caminho_modelo": MODELO_PATH,
        "caminho_hash": HASH_PATH,
        "sha256_verificado": False,
        "status": "fallback_heuristico",
        "erro": None,
    }

    if not os.path.exists(MODELO_PATH):
        logger.warning(
            "Modelo '%s' não encontrado. Ativando fallback heurístico defensivo (modo resiliência).",
            MODELO_PATH,
        )
        info["erro"] = "arquivo_modelo_nao_encontrado"
        return None, "fallback_heuristico", info

    if not os.path.exists(HASH_PATH):
        logger.warning(
            "Arquivo de hash '%s' não encontrado para '%s'. Carga do modelo recusada por segurança.",
            HASH_PATH,
            MODELO_PATH,
        )
        info["erro"] = "arquivo_hash_nao_encontrado"
        return None, "fallback_heuristico", info

    try:
        with open(HASH_PATH, "r", encoding="utf-8") as f:
            conteudo_hash = f.read().strip()
            hash_esperado = conteudo_hash.split()[0].lower() if conteudo_hash else ""

        hash_calculado = calcular_sha256(MODELO_PATH)

        if not hash_esperado or not hmac.compare_digest(hash_calculado, hash_esperado):
            logger.error(
                "VIOLAÇÃO DE INTEGRIDADE (SEC-MED-03): Hash SHA-256 divergente em '%s'! "
                "Esperado: %s | Calculado: %s. Carga cancelada imediatamente.",
                MODELO_PATH,
                hash_esperado,
                hash_calculado,
            )
            info["erro"] = "hash_sha256_divergente"
            info["hash_calculado"] = hash_calculado
            return None, "fallback_heuristico", info

        logger.info(
            "Integridade SHA-256 do modelo verificada com sucesso (%s). Carregando pipeline...",
            hash_calculado,
        )
        modelo_carregado = joblib.load(MODELO_PATH)
        info["sha256_verificado"] = True
        info["hash_sha256"] = hash_calculado
        info["status"] = "modelo_ia"
        logger.info("Modelo Anjo da Guarda carregado e pronto para inferência.")
        return modelo_carregado, "modelo_ia", info

    except Exception as exc:
        logger.exception("Falha inesperada ao carregar modelo de IA: %s", exc)
        info["erro"] = f"excecao: {str(exc)}"
        return None, "fallback_heuristico", info


# Execução segura na inicialização (sem crash com FileNotFoundError)
modelo, modo_ativo, modelo_info = carregar_modelo_defensivo()


@app.on_event("startup")
def startup_event():
    global modelo, modo_ativo, modelo_info
    if modo_ativo != "modelo_ia":
        modelo, modo_ativo, modelo_info = carregar_modelo_defensivo()


def limpar_texto(texto: str) -> str:
    t = str(texto).lower()
    # Converte leet speak simples
    mapa_leet = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a'}
    for k, v in mapa_leet.items():
        t = t.replace(k, v)
    # Normaliza múltiplos espaços
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def sanitizar_saida(texto: str, max_len: int = 280) -> str:
    if XSS_OUTPUT_PATTERN.search(texto):
        return "[CONTEUDO_SANITIZADO]"
    return html.escape(texto, quote=True)[:max_len]


def analisar_heuristico(texto_limpo: str) -> Tuple[str, float]:
    """Fallback heurístico defensivo para detecção de fraudes contra 50+ (SEC-CRIT-03)."""
    t = texto_limpo.lower()

    # 1. Credenciais, senhas, códigos SMS, gov.br, falsa central e motoboy
    if re.search(
        r"\b(senha|token|cvv|6\s*digitos|codigo\s*de\s*(seguranca|verificacao|confirmacao|acesso))\b"
        r"|(\bcodigo\b.*\b(sms|celular|zap|whatsapp|gov\.?br|anydesk|teamviewer)\b)"
        r"|(\b(digite|passe|mande|envia|informe)\b.*\b(codigo|senha|cartao|gov\.?br|token)\b)"
        r"|(\b(motoboy|portador)\b.*\b(cartao|senha)\b)"
        r"|(\bcentral\s*de\s*seguranca\b.*\b(senha|token|cartao|bloqueio|compra\s*suspeita)\b)",
        t,
    ):
        return "PEDIDO_CREDENCIAL", 96.0

    # 2. Links maliciosos / Phishing / Acesso Remoto / INSS falso
    if re.search(
        r"(https?://\S+|www\.\S+|bit\.ly/\S+|tinyurl\.com/\S+|t\.co/\S+|\b\w+\.apk\b|\b\w+\.exe\b)"
        r"|(\b(anydesk|teamviewer|rustdesk|acesso\s*remoto)\b)"
        r"|(\b(inss|prova\s*de\s*vida|recadastramento\s*biometrico)\b.*\b(link|bloqueado|suspenso|regularize|clique|acesse)\b)"
        r"|(\b(clica|clique|acesse|baixe|abra|instale)\b.*\b(link|anexo|fotos|album|arquivo|aplicativo|modulo)\b)",
        t,
    ):
        return "LINK_MALICIOSO", 94.0

    # 3. Ameaça e Extorsão
    if re.search(
        r"\b(delegado|delegacia|viatura|policia|mandado|cadeia|prisao|fianca|intimacao)\b"
        r"|(\b(se\s*nao\s*pagar|vai\s*preso|parar\s*na\s*sua\s*casa|vazar\s*(os\s*)?prints|penhora)\b)",
        t,
    ):
        return "AMEACA_EXTORSAO", 95.0

    # 4. Falsa herança, doação, falso advogado / precatório ou pacote retido / Correios
    if re.search(
        r"\b(doenca\s*terminal|fortuna\s*acumulada|taxa\s*cartoraria|tabeliao|saldo\s*remanescente)\b"
        r"|(\bdoar\b.*\b(dolares|milhoes|fortuna)\b)"
        r"|(\b(precatorio|rpv|alvara\s*judicial|custas\s*processuais|processo\s*ganho)\b.*\b(pix|taxa|pagar|guia|liberar|honorarios)\b)",
        t,
    ):
        return "FALSA_DOACAO_HERANCA", 93.0

    if re.search(
        r"\b(mala\s*(com)?\s*dolares|barras\s*de\s*ouro|alfandega|receita\s*federal|taxa\s*aduaneira|despacho\s*postal|pacote\s*(retido|confiscado))\b"
        r"|(\b(correios|objeto\s*postal|encomenda)\b.*\b(taxado|taxa|alfandega|retid[oa]|pix)\b)",
        t,
    ):
        return "ENCOMENDA_TAXA", 93.0

    # 5. Investimento milagroso / Criptomoedas / Tarefa remunerada / Urubu do Pix
    if re.search(
        r"\b(cripto|criptomoeda|bitcoin|rendendo|lucro\s*garantido|retorno\s*garantido|piramide|urubu\s*do\s*pix)\b"
        r"|(\b(tarefa\s*remunerada|tarefas?\s*vip|missoes\s*vip|deposito\s*de\s*recarga)\b)"
        r"|(\b(curtindo\s*videos|avaliando\s*(lojas|hoteis))\b.*\b(pix|ganhe|comiss[oa]|dinheiro)\b)"
        r"|(\b\d+%\s*ao\s*dia\b)|(\bdobre\s*seu\s*dinheiro\b)",
        t,
    ):
        return "INVESTIMENTO_SUSPEITO", 92.0

    # 6. Falso Intermediário / Falso Parente ("Oi mãe, troquei de número")
    if re.search(
        r"\b(neto|filho|sobrinho|mecanico|terminal\s*rodoviario|sem\s*bateria|celular\s*novo|numero\s*novo)\b.*\b(pix|socorrer|dinheiro|guincho|ajuda|salva)\b"
        r"|(\b(troquei\s*de\s*numero|numero\s*novo|mudei\s*de\s*whatsapp)\b)"
        r"|(\boi\s*(tia|tio|mae|pai|vovo|vo)\b.*\b(pix|socorro|guincho|troquei|celular\s*quebrou|limite)\b)",
        t,
    ):
        return "FALSO_INTERMEDIARIO", 94.0

    # 7. Emergência financeira com saúde / socorro / sequestro
    if re.search(
        r"\b(infarto|hospital|acidente|guincho|internado|cirurgia|urgencia\s*medica|sequestrado|resgate)\b.*\b(pix|deposito|transferencia|dinheiro)\b",
        t,
    ):
        return "EMERGENCIA_FINANCEIRA", 92.0

    # 8. Pedido de dinheiro / PIX explícito / Pix errado / Falsa vaga / Conta segura
    if re.search(
        r"\b(pix|p\.i\.x|p-i-x)\b.*\b(chave|urgente|saldo|fazer|manda|transfere|deposite|conta|errado|devolve|estorno|teste|admissional)\b"
        r"|(\b(pix\s*errado|deposito\s*errado|conta\s*segura|exame\s*admissional)\b.*\b(pix|devolve|chave|transfere|pague)\b)"
        r"|(\b(fazer|manda|faz|passa|transfere|empresta)\b.*\b(um\s*pix|dinheiro|reais|saldo|boleto)\b)",
        t,
    ):
        return "PEDIDO_DINHEIRO", 90.0

    # 9. Mensagem de segredo / manipulação suspeita / migração de plataforma
    if re.search(
        r"\b(apaga\s*(essa|nossa)\s*conversa|nao\s*fale\s*com\s*(seus\s*)?(filhos|parentes)|segredo\s*nosso|nao\s*conta\s*pra\s*ninguem)\b"
        r"|(\b(sair\s*desse\s*aplicativo|conversar\s*no\s*whatsapp|passa\s*seu\s*(zap|whatsapp|numero))\b)",
        t,
    ):
        return "MENSAGEM_SUSPEITA", 88.0

    # 10. Sondagem financeira
    if re.search(
        r"\b(aposentadoria|quanto\s*ganha|casa\s*propria\s*ou\s*aluguel|mora\s*sozinh[oa]|limite\s*do\s*cartao|margem\s*(de\s*emprestimo\s*)?consignad[oa])\b",
        t,
    ):
        return "SONDAGEM_FINANCEIRA", 87.0

    return "NORMAL", 85.0


class MensagemChat(BaseModel):
    texto: str = Field(..., min_length=1, max_length=4000)


@app.get("/")
def root():
    return {
        "service": "API Anjo da Guarda - BeyondTime",
        "status": "online",
        "modo_ativo": modo_ativo,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modo_ativo": modo_ativo,
        "modelo_carregado": modelo is not None,
        "detalhes": modelo_info,
    }


@app.post("/analisar")
def analisar_mensagem(mensagem: MensagemChat):
    texto_limpo = limpar_texto(mensagem.texto)
    if not texto_limpo:
        raise HTTPException(
            status_code=422,
            detail="O texto informado não possui conteúdo válido para análise.",
        )

    if modo_ativo == "modelo_ia" and modelo is not None:
        try:
            previsao = modelo.predict([texto_limpo])[0]
            probabilidades = modelo.predict_proba([texto_limpo])[0]
            certeza = float(max(probabilidades)) * 100
        except Exception as exc:
            logger.error("Erro durante predição pelo modelo: %s. Usando fallback heurístico.", exc)
            previsao, certeza = analisar_heuristico(texto_limpo)
    else:
        previsao, certeza = analisar_heuristico(texto_limpo)

    return {
        "texto_original": sanitizar_saida(mensagem.texto),
        "texto_limpo_ia": sanitizar_saida(texto_limpo),
        "intencao": previsao,
        "certeza_percentual": round(certeza, 2),
    }
