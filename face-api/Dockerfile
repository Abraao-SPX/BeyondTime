FROM python:3.11-slim

WORKDIR /app

# Instala dependências do sistema necessárias para o OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copia o script de download e a estrutura antes do app para baixar modelos
COPY models/download_models.sh /app/models/
RUN chmod +x /app/models/download_models.sh && cd /app/models && ./download_models.sh

COPY . .

# Expor a porta que o FastAPI usa
EXPOSE 8000

# Comando para rodar a aplicação
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

