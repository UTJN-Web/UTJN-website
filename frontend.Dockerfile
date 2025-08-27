# --- Build stage ---
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # 依存だけ先に入れてキャッシュ効率UP
    COPY package*.json ./
    RUN npm ci
    
    # アプリコード
    COPY . .
    
    # Next.js を本番ビルド
    # 必要なら .env.production などを COPY して NEXT_PUBLIC_* を注入
    RUN npm run build
    
    # --- Runtime stage ---
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    # Next.js が画像最適化等で必要な場合あり
    ENV NEXT_TELEMETRY_DISABLED=1
    
    # 実行に必要な成果物のみコピー
    COPY --from=builder /app ./
    
    EXPOSE 3000
    # next start（Devサーバではなく本番サーバ）
    CMD ["npm", "run", "start"]
    