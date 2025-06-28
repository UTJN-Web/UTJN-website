# ベースとなるイメージ（Node.js環境）
FROM node:18

# 作業ディレクトリを作成
WORKDIR /app

# package.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# 残りのコードを全部コピー
COPY . .

# Next.jsアプリのポートを公開
EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "run", "dev"]
