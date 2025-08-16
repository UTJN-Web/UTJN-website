// lib/dbMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';

// データベース接続のヘルスチェック
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

// データベース接続の最適化ミドルウェア
export function withDatabaseOptimization(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    
    try {
      // データベース接続の確認
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) {
        return NextResponse.json(
          { error: 'Database connection failed' },
          { status: 503 }
        );
      }
      
      // ハンドラーの実行
      const result = await handler(req, ...args);
      
      // 実行時間の記録（開発環境のみ）
      if (process.env.NODE_ENV !== 'production') {
        const executionTime = Date.now() - startTime;
        console.log(`Database operation completed in ${executionTime}ms`);
      }
      
      return result;
    } catch (error) {
      console.error('Database operation failed:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// 接続プールの監視
export function monitorConnectionPool() {
  // Prismaクライアントの接続状態を監視
  prisma.$on('query' as any, (e: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Query: ${e.query}`);
      console.log(`Params: ${e.params}`);
      console.log(`Duration: ${e.duration}ms`);
    }
  });
  
  prisma.$on('error' as any, (e: any) => {
    console.error('Prisma error:', e);
  });
  
  prisma.$on('info' as any, (e: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Prisma info:', e);
    }
  });
  
  prisma.$on('warn' as any, (e: any) => {
    console.warn('Prisma warning:', e);
  });
}

// データベース接続の初期化
export async function initializeDatabase() {
  try {
    await prisma.$connect();
    monitorConnectionPool();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
} 