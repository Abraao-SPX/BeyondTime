import os
import hashlib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, 'dataset.csv') if os.path.exists(os.path.join(BASE_DIR, 'dataset.csv')) else 'dataset.csv'
MODELO_PATH = os.path.join(BASE_DIR, 'modelo_anjo.joblib')
HASH_PATH = os.path.join(BASE_DIR, 'modelo_anjo.joblib.sha256')

def limpar_texto(texto):
    t = str(texto).lower()
    # Converte leet speak simples
    mapa_leet = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a'}
    for k, v in mapa_leet.items():
        t = t.replace(k, v)
    # Normaliza múltiplos espaços sem apagar pontuações de ofuscação (ex: p.i.x, c-v-v)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

print(f"1. Carregando o dataset de '{DATASET_PATH}'...")
df = pd.read_csv(DATASET_PATH)
print(f"Total carregado: {len(df)} linhas em {df['label'].nunique()} classes.")
print(df['label'].value_counts().to_string())

# Higieniza mantendo símbolos essenciais para detecção de ofuscação
df['texto_limpo'] = df['texto'].apply(limpar_texto)

X = df['texto_limpo']
y = df['label']

# Split estratificado para avaliação científica
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("\n2. Construindo Pipeline com TF-IDF (N-Grams 1-2 e tokenização de símbolos)...")
modelo = make_pipeline(
    TfidfVectorizer(
        token_pattern=r"(?u)\S+",
        ngram_range=(1, 2),
        min_df=2,
        sublinear_tf=True
    ),
    LogisticRegression(max_iter=1000, class_weight='balanced')
)

print("3. Treinando e avaliando modelo no split de validação (80/20)...")
modelo.fit(X_train, y_train)
y_pred = modelo.predict(X_test)
print("\n--- RELATÓRIO DE MÉTRICAS (TEST SPLIT 20%) ---")
print(classification_report(y_test, y_pred, digits=4))

print("4. Re-treinando modelo com 100% da base para produção...")
modelo.fit(X, y)

print("\n5. Testando a IA com frases inéditas do mundo real:")
frases_teste = [
    "Bom dia meu amor, que Deus abençoe seu dia e da sua família",
    "Hoje eu fui pessoalmente no banco resolver o extrato do INSS e deu tudo certo",
    "Você consegue me fazer um pix de 300 reais para cobrir meu saldo?",
    "Oi, fiz um Pix errado de R$ 400 na sua conta, devolve nessa outra chave aqui urgente!",
    "m a n d a   u m   p.i.x   a g o r a   u r g e n t e",
    "Vamos sair desse aplicativo e conversar no WhatsApp porque aqui tem muita fiscalização",
    "Passei o dia com fome porque acabou o gás e ninguém se importa comigo...",
    "Apaga essa nossa conversa do celular para seus filhos não verem nada",
    "Sou o delegado da delegacia e a viatura vai parar na sua casa se não pagar a fiança",
    "Alô mãe, socorro! Bati o carro na estrada, faz um Pix pro guincho agora!",
    "Mandei uma mala com dólares para você, mas a Receita Federal segurou na alfândega",
    "CORREIOS: Seu objeto foi taxado na alfândega de Curitiba, pague a guia no Pix hoje",
    "Descobri uma corretora para investir em criptomoedas rendendo 5% ao dia garantido",
    "Olá, somos da Shopee! Ganhe R$ 300 por dia curtindo vídeos no TikTok e fazendo tarefas VIP",
    "INSS AVISO: Pendência na sua Prova de Vida. Seu benefício será bloqueado em 24h: https://meuinss-provadevida-gov.online",
    "Baixe o aplicativo AnyDesk no seu celular para eu cancelar a compra suspeita na sua conta",
    "Olá, aqui é do escritório de advocacia, seu precatório de R$ 48.000 foi liberado! Pague as custas no Pix",
    "Aqui é da central de segurança do banco, confirme sua senha e o token para cancelar a compra de R$ 2.500",
    "Seu cartão foi clonado, corte o cartão e entregue junto com a senha pro motoboy do banco",
    "Você mora em casa própria ou paga aluguel? Já usou sua margem consignável do INSS?",
    "Oi mãe, troquei de número, salva esse aqui. Consegue fazer um Pix de R$ 800 pra pagar um boleto hoje?"
]

previsoes = modelo.predict([limpar_texto(f) for f in frases_teste])
probabilidades = modelo.predict_proba([limpar_texto(f) for f in frases_teste])

for frase, previsao, prob in zip(frases_teste, previsoes, probabilidades):
    chance = max(prob) * 100 
    print(f"\nMensagem: '{frase}'")
    print(f"-> Intenção: {previsao} (Certeza: {chance:.1f}%)")

print(f"\n6. Salvando o cérebro da IA no arquivo '{MODELO_PATH}'...")
joblib.dump(modelo, MODELO_PATH)

print("7. Gerando hash de integridade SHA-256 (SEC-CRIT-03, SEC-MED-03)...")
hasher = hashlib.sha256()
with open(MODELO_PATH, 'rb') as f:
    while chunk := f.read(65536):
        hasher.update(chunk)
digest = hasher.hexdigest()

with open(HASH_PATH, 'w', encoding='utf-8') as f:
    f.write(f"{digest}\n")

print(f"Checksum SHA-256 gravado com sucesso em '{HASH_PATH}':\n-> {digest}")
print("Treinamento e exportação concluídos com sucesso!")
