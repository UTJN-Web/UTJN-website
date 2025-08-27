FROM python:3.11-slim
WORKDIR /app

# OS 依存が要る場合ここで（例: psycopg2-binary なら不要）
# RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# 依存
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体
# 例：認証/ルーター/スキーマなど一式
COPY authentication ./authentication
COPY main.py ./
COPY .env ./.env
# もし他にもパッケージがあるなら COPY 追加

# アップロード用ディレクトリ（暫定。将来はS3推奨）
RUN mkdir -p /app/uploads/event_images

EXPOSE 8000
# 本番は --reload を外す。ワーカー並列を上げたい場合は --workers など
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
