// lib/db.ts
import { PrismaClient } from '@prisma/client';

// グローバル変数としてPrismaクライアントを管理
declare global {
  var __prisma: PrismaClient | undefined;
}

// 最適化されたPrismaクライアントの作成
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // 本番環境ではクエリログを最小限に
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] 
      : ['query', 'error', 'warn'],
    
    // 接続プールの設定
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    
    // トランザクションのタイムアウト設定
    transactionOptions: {
      maxWait: 2000, // 2秒
      timeout: 5000, // 5秒
    },
  });
}

// グローバルシングルトンパターンでPrismaクライアントを管理
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// データベース接続の初期化
export async function initDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// データベース接続の終了
export async function closeDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection failed:', error);
  }
}

// ヘルスチェック用の関数
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export default prisma; 