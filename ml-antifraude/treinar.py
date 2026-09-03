import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
import joblib
import re

def limpar_texto(texto):
    t = str(texto).lower()
    mapa_leet = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a'}
    for k, v in mapa_leet.items():
        t = t.replace(k, v)
    t = re.sub(r'[.\-_\/\|*!]', '', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

print("1. Carregando o dataset multiclasse...")
df = pd.read_csv('dataset.csv')

# Limpa todas as frases do dataset antes de treinar
df['texto'] = df['texto'].apply(limpar_texto)

X = df['texto']
y = df['label']

print("2. Construindo a Inteligência para Múltiplas Intenções...")
modelo = make_pipeline(
    TfidfVectorizer(lowercase=True), 
    LogisticRegression(max_iter=1000)
)

print("3. Treinando a IA com os padrões focados em fraude financeira...")
modelo.fit(X, y)

print("\n4. Testando a IA com frases inéditas:")

frases_teste = [
    "Meu filho configurou meu pix ontem.", # NORMAL
    "Faz um pix de 100 reais para mim, te pago amanhã", # PEDIDO_DINHEIRO
    "Estou no hospital e perdi a carteira", # EMERGENCIA_FINANCEIRA
    "Posso te ensinar a investir em bitcoin com lucro garantido", # INVESTIMENTO_SUSPEITO
    "Qual é o seu código do sms que chegou aí?", # PEDIDO_CREDENCIAL
    "Você tem dinheiro na poupança no banco?" # SONDAGEM_FINANCEIRA
]

previsoes = modelo.predict(frases_teste)
probabilidades = modelo.predict_proba(frases_teste)

for frase, previsao, prob in zip(frases_teste, previsoes, probabilidades):
    chance = max(prob) * 100 
    print(f"\nMensagem: '{frase}'")
    print(f"-> Intenção: {previsao} (Certeza: {chance:.1f}%)")

print("\n5. Salvando o cérebro da IA multiclasse no arquivo 'modelo_anjo.joblib'...")
joblib.dump(modelo, 'modelo_anjo.joblib')
print("Concluído com sucesso!")
