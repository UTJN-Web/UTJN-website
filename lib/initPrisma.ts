// lib/initPrisma.ts

import {
    SecretsManagerClient,
    GetSecretValueCommand,
  } from "@aws-sdk/client-secrets-manager";
  import { PrismaClient } from "@prisma/client";
  
  let prisma: PrismaClient;
  
  export async function initPrisma() {  
  
    // URLエンコードで安全な形式に
    const encodedPassword = encodeURIComponent(".7yS:(eUe<Zrw9hFO_ne1BHU1p1o");
  
    // DATABASE_URL を実行時に動的に設定
    process.env.DATABASE_URL = `postgresql://postgres:${encodedPassword}@utjn-db.ch68m8sgy7on.us-east-2.rds.amazonaws.com:5432/utjn`;

    prisma = new PrismaClient();
  }
  
  export { prisma };
  