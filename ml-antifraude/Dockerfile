# Usa uma imagem oficial do Python, bem leve (slim)
FROM python:3.11-slim

# Define que tudo o que fizermos a partir de agora será dentro da pasta /app no container
WORKDIR /app

# Copia apenas as dependências primeiro (isso deixa o Docker mais rápido)
COPY requirements.txt .

# Instala as bibliotecas de Inteligência Artificial e da API
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o resto (api.py, modelo_anjo.joblib, etc) para dentro do container
COPY . .

# Libera a porta 8000 para que o Java e o App possam conversar com esse container
EXPOSE 8000

# O comando exato que liga o servidor da API (0.0.0.0 garante que aceite conexões externas ao container)
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
