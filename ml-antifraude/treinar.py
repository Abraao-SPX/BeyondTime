import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import re

def limpar_texto(texto):
    t = str(texto).lower()
    # Converte leet speak simples
    mapa_leet = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a'}
    for k, v in mapa_leet.items():
        t = t.replace(k, v)
    # Normaliza múltiplos espaços sem apagar pontuações de ofuscação (ex: p.i.x, c-v-v)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

print("1. Carregando o dataset de 15.000 frases e 13 classes...")
df = pd.read_csv('dataset.csv')
print(f"Total carregado: {len(df)} linhas.")

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
    "Você consegue me fazer um pix de 300 reais para cobrir meu saldo?",
    "m a n d a   u m   p.i.x   a g o r a   u r g e n t e",
    "faz um p-i-x nessa chave pra mim por favor",
    "Passei o dia com fome porque acabou o gás e ninguém se importa comigo...",
    "Apaga essa nossa conversa do celular para seus filhos não verem nada",
    "Sou o delegado da delegacia e a viatura vai parar na sua casa se não pagar a fiança",
    "Minha mãe teve um infarto na rodovia e o guincho está cobrando Pix adiantado",
    "Mandei uma mala com dólares para você, mas a Receita Federal segurou na alfândega",
    "Descobri uma corretora para investir em criptomoedas rendendo 5% ao dia garantido",
    "Clica nesse link para ver as fotos: https://bit.ly/fotos-album",
    "Sou viúva com doença terminal e quero doar 500 mil dólares, pague a taxa cartorária",
    "Me passa o código de 6 dígitos que chegou por SMS no seu celular agora",
    "Você mora em casa própria ou paga aluguel? Quanto ganha de aposentadoria?",
    "Oi tia, sou o mecânico do seu neto Pedro, ele está sem bateria e precisa de Pix pro guincho"
]

previsoes = modelo.predict([limpar_texto(f) for f in frases_teste])
probabilidades = modelo.predict_proba([limpar_texto(f) for f in frases_teste])

for frase, previsao, prob in zip(frases_teste, previsoes, probabilidades):
    chance = max(prob) * 100 
    print(f"\nMensagem: '{frase}'")
    print(f"-> Intenção: {previsao} (Certeza: {chance:.1f}%)")

print("\n6. Salvando o cérebro da IA no arquivo 'modelo_anjo.joblib'...")
joblib.dump(modelo, 'modelo_anjo.joblib')
print("Treinamento e exportação concluídos com sucesso!")
