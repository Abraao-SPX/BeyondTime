# Documentação Completa: ML Anti-Fraude (Anjo da Guarda)

Este documento foi criado para registrar **tudo** o que fizemos até agora na pasta `ml-antifraude`, explicando o que cada arquivo faz e como todo o processo funciona.

---

## 1. O que nós construímos?

Criamos a **Primeira Camada de Inteligência Artificial** do aplicativo BeyondTime. 
O objetivo desta camada não é banir usuários, mas **classificar as intenções de cada frase** (ex: perceber se alguém está pedindo um PIX, fingindo uma emergência no hospital ou tentando levar a conversa para o WhatsApp). 

Com essa intenção identificada, o sistema principal (que faremos depois em Java) vai poder acumular esses alertas e tomar uma decisão.

## 2. O que cada arquivo faz? (O Processo Passo a Passo)

### 📄 `dataset.csv` (A Base do Conhecimento)
- **Para que serve:** É a matéria-prima. A IA não sabe falar português, ela precisa de exemplos.
- **O que faz:** Contém dezenas de frases categorizadas. Nós criamos categorias como `NORMAL`, `PEDIDO_DINHEIRO`, `EMERGENCIA_FINANCEIRA`, `PEDIDO_CREDENCIAL`, etc. A IA lê isso para entender os padrões das palavras.

### 📄 `treinar.py` (A Sala de Aula da IA)
- **Para que serve:** É o script que ensina a máquina. Só precisa ser rodado quando quisermos melhorar a IA (ex: adicionarmos frases novas no CSV).
- **O que faz:** 
  1. Ele lê o `dataset.csv`.
  2. Ele usa o `TfidfVectorizer` (um tradutor que transforma as palavras das frases em números e pesos matemáticos. Palavras raras e suspeitas ganham muito peso).
  3. Ele usa o `LogisticRegression` (um algoritmo matemático que traça limites para separar o que é golpe do que é amizade).
  4. Por fim, ele salva todo esse aprendizado em um arquivo físico.

### 📄 `modelo_anjo.joblib` (O Cérebro)
- **Para que serve:** É o produto final do `treinar.py`. É a IA já "treinada".
- **O que faz:** Guarda toda a matemática pronta. Graças a ele, não precisamos ler o CSV toda vez que formos analisar uma mensagem.

### 📄 `api.py` (A Boca e os Ouvidos da IA)
- **Para que serve:** O cérebro (`.joblib`) é fechado, não consegue conversar com o App e nem com o Java. Para isso criamos a API usando o **FastAPI**.
- **O que faz:** Ele liga um servidor web local. Fica "escutando" aguardando alguém mandar um texto. Quando chega o texto, ele passa pelo cérebro (`modelo.predict`) e devolve a resposta no formato JSON.

---

## 3. Como eu posso testar agora mesmo (Sem as telas prontas)?

Como as telas não existem ainda, você pode testar o motor puro direto no terminal.

### Passo A: Ligar o Servidor API
1. Abra um terminal na pasta `ml-antifraude`.
2. Ative o ambiente virtual: `source venv/bin/activate`
3. Instale as ferramentas da API: `pip install fastapi uvicorn pydantic`
4. Ligue a API: `uvicorn api:app --reload`
*(Você verá uma mensagem dizendo que o servidor está rodando em `http://127.0.0.1:8000`)*

### Passo B: Mandar uma mensagem falsa (Testar)
Com o servidor rodando em uma janela, abra **outro terminal** e simule que o Aplicativo Java está enviando uma mensagem. Cole isto:

**Teste 1 (Tentativa de Golpe via Pix):**
```bash
curl -X POST http://127.0.0.1:8000/analisar \
-H "Content-Type: application/json" \
-d '{"texto": "Oi, faz um pix de 1500 pra mim urgente?"}'
```
Você verá a IA respondendo algo como:
`{"texto_analisado":"Oi, faz um pix de 1500 pra mim urgente?","intencao":"PEDIDO_DINHEIRO","certeza_percentual":42.5}`

**Teste 2 (Conversa Normal):**
```bash
curl -X POST http://127.0.0.1:8000/analisar \
-H "Content-Type: application/json" \
-d '{"texto": "Hoje eu fui ao banco resolver um problema do meu limite."}'
```
Você verá a IA respondendo:
`{"texto_analisado":"Hoje eu fui ao banco resolver um problema do meu limite.","intencao":"NORMAL","certeza_percentual":39.2}`

---

## 4. Como rodar a IA no Docker? (A Melhor Abordagem)

Executar a inteligência no **Docker** é a forma mais profissional e recomendada, porque isola completamente o Python. O seu computador (ou o Java) nem precisa ter Python instalado! 

### Passo A: Construir (Build) a Imagem
Na pasta `ml-antifraude`, rode o seguinte comando no terminal. Ele vai ler o arquivo `Dockerfile`, baixar o Python e as dependências e empacotar tudo numa "caixa" fechada chamada `beyondtime-ia`:

```bash
docker build -t beyondtime-ia .
```

### Passo B: Ligar o Container
Agora basta ligar essa "caixa", conectando a porta 8000 do container com a porta 8000 do seu computador:

```bash
docker run -d -p 8000:8000 --name anjo-da-guarda beyondtime-ia
```

Pronto! A IA está rodando de forma 100% isolada e silenciosa em background. Os testes do **Passo 3** funcionarão perfeitamente. 

*(Quando quiser desligar, basta rodar `docker stop anjo-da-guarda`)*

---
Pronto! Com isso você tem o núcleo de Machine Learning pronto, 100% isolado, documentado, empacotado em Docker e testável via código, pronto para plugar no resto do projeto quando ele for criado!

