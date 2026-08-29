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
class MensagemChat(BaseModel):
    texto: str

# 4. Cria a rota principal. Quando alguém bater no endereço /analisar enviando dados...
@app.post("/analisar")
def analisar_mensagem(mensagem: MensagemChat):
    
    # Pega o texto recebido e pede para a IA fazer a previsão
    previsao = modelo.predict([mensagem.texto])[0]
    
    # Pega a probabilidade/certeza daquela previsão
    probabilidades = modelo.predict_proba([mensagem.texto])[0]
    certeza = max(probabilidades) * 100
    
    # Devolve a resposta no formato padrão que qualquer sistema consegue ler (JSON)
    return {
        "texto_analisado": mensagem.texto,
        "intencao": previsao,
        "certeza_percentual": round(certeza, 2)
    }

# Para rodar isso, o comando será: uvicorn api:app --reload
