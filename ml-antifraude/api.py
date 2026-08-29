from fastapi import FastAPI
from pydantic import BaseModel
import joblib

# 1. Cria a nossa aplicação web (A 'ponte' para o mundo externo)
app = FastAPI(title="API Anjo da Guarda - BeyondTime")

# 2. Carrega o nosso 'cérebro' que já foi treinado na etapa anterior
# Fazemos isso fora da rota para carregar apenas uma vez quando o servidor ligar
print("Carregando modelo de IA...")
modelo = joblib.load('modelo_anjo.joblib')

# 3. Define o formato exato da informação que esperamos receber do Java/Aplicativo
# Isso diz para a API: "Eu espero receber um JSON que tenha um campo chamado 'texto'"
import re

# Função de blindagem anti-ofuscação
def limpar_texto(texto):
    t = str(texto).lower()
    # Converte números disfarçados de letras (Leet Speak)
    mapa_leet = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a'}
    for k, v in mapa_leet.items():
        t = t.replace(k, v)
    # Remove pontuações estranhas no meio das palavras (ex: p.i.x, w-h-a-t-s)
    t = re.sub(r'[.\-_\/\|*!]', '', t)
    # Remove espaços duplos
    t = re.sub(r'\s+', ' ', t).strip()
    return t

class MensagemChat(BaseModel):
    texto: str

@app.post("/analisar")
def analisar_mensagem(mensagem: MensagemChat):
    # 1. Aplicamos a "vacina" (Limpeza) ANTES de enviar para a IA
    texto_limpo = limpar_texto(mensagem.texto)
    
    # 2. IA analisa o texto já higienizado
    previsao = modelo.predict([texto_limpo])[0]
    probabilidades = modelo.predict_proba([texto_limpo])[0]
    certeza = max(probabilidades) * 100
    
    return {
        "texto_original": mensagem.texto,
        "texto_limpo_ia": texto_limpo,
        "intencao": previsao,
        "certeza_percentual": round(certeza, 2)
    }

# Para rodar isso, o comando será: uvicorn api:app --reload

