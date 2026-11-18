import html
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib

# 1. Cria a nossa aplicação web (A 'ponte' para o mundo externo)
app = FastAPI(title="API Anjo da Guarda - BeyondTime")

# 2. Carrega o nosso 'cérebro' que já foi treinado na etapa anterior
# Fazemos isso fora da rota para carregar apenas uma vez quando o servidor ligar
print("Carregando modelo de IA...")
modelo = joblib.load('modelo_anjo.joblib')

XSS_OUTPUT_PATTERN = re.compile(
    r"<\s*/?\s*[a-z!]|javascript\s*:|vbscript\s*:|data\s*:\s*text/html|\bon[a-z]{2,30}\s*=",
    re.IGNORECASE,
)


# Função de higienização alinhada com o modelo treinado
def limpar_texto(texto: str) -> str:
    t = str(texto).lower()
    # Converte números disfarçados de letras (Leet Speak)
    mapa_leet = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a'}
    for k, v in mapa_leet.items():
        t = t.replace(k, v)
    # Normaliza espaços múltiplos sem apagar os símbolos de ofuscação
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def sanitizar_saida(texto: str, max_len: int = 280) -> str:
    if XSS_OUTPUT_PATTERN.search(texto):
        return "[CONTEUDO_SANITIZADO]"
    return html.escape(texto, quote=True)[:max_len]


class MensagemChat(BaseModel):
    texto: str = Field(..., min_length=1, max_length=4000)


@app.post("/analisar")
def analisar_mensagem(mensagem: MensagemChat):
    # 1. Aplicamos a "vacina" (Limpeza) ANTES de enviar para a IA
    texto_limpo = limpar_texto(mensagem.texto)
    if not texto_limpo:
        raise HTTPException(
            status_code=422,
            detail="O texto informado não possui conteúdo válido para análise.",
        )

    # 2. IA analisa o texto já higienizado
    previsao = modelo.predict([texto_limpo])[0]
    probabilidades = modelo.predict_proba([texto_limpo])[0]
    certeza = float(max(probabilidades)) * 100

    return {
        "texto_original": sanitizar_saida(mensagem.texto),
        "texto_limpo_ia": sanitizar_saida(texto_limpo),
        "intencao": previsao,
        "certeza_percentual": round(certeza, 2),
    }

# Para rodar isso, o comando será: uvicorn api:app --reload

