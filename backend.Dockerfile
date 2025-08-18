# backend.Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create uploads directory
RUN mkdir -p uploads/event_images

COPY authentication ./authentication
# ルートにある main.py などエントリーポイントもコピー
COPY main.py .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
