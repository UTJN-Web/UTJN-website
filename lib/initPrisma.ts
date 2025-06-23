// lib/initPrisma.ts

import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";
  import { PrismaClient } from "@prisma/client";
  
  const secret_name = "rdsdb-2454f7d1-b6f2-4366-95f6-1ccf8b4be221"; // Secrets Manager の名前
  const client = new SecretsManagerClient({ region: "us-east-2" });
  
  let prisma: PrismaClient;
  
  export async function initPrisma() {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secret_name })
    );
  
    const secret = JSON.parse(response.SecretString!);
  
    // URLエンコードで安全な形式に
    const encodedPassword = encodeURIComponent(secret.password);
  
    // DATABASE_URL を実行時に動的に設定
    process.env.DATABASE_URL = `postgresql://${secret.username}:${encodedPassword}@${secret.host}:${secret.port}/${secret.dbname}`;
  
    prisma = new PrismaClient();
  }
  
  export { prisma };
  