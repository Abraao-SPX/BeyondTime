# Usa uma imagem oficial do Python, bem leve (slim)
FROM python:3.11-slim

# Cria usuário e grupo de sistema sem privilégios (SEC-BAIXA-02)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

# Define que tudo o que fizermos a partir de agora será dentro da pasta /app no container
WORKDIR /app

# Copia apenas as dependências primeiro (otimização de cache Docker)
COPY requirements.txt .

# Instala as bibliotecas de Inteligência Artificial e da API
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código-fonte da aplicação
COPY . .

# Garante a existência do dataset e treina o modelo no build com hash SHA-256 (SEC-CRIT-03, SEC-MED-03)
RUN if [ ! -f dataset.csv ]; then python gerar_dataset_massivo.py; fi && \
    python treinar.py

# Ajusta propriedade dos arquivos para o usuário não-root (SEC-BAIXA-02)
RUN chown -R appuser:appgroup /app

# Execução segura como usuário não-root
USER appuser

# Libera a porta 8000 para que o Java e o App possam conversar com esse container
EXPOSE 8000

# O comando exato que liga o servidor da API (0.0.0.0 garante que aceite conexões na rede interna do Docker)
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
