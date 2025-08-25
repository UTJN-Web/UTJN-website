# Database Migration Scripts

このディレクトリには、UTJNウェブサイトのデータベーススキーマを更新するためのマイグレーションスクリプトが含まれています。

## 概要

データベースに新しいカラムやテーブルを追加する必要がある場合、このディレクトリにマイグレーションスクリプトを作成して実行します。

## 前提条件

- Dockerが起動していること
- バックエンドAPIコンテナ（`utjn-website-api-1`）が実行中であること
- 必要なPythonパッケージがインストールされていること（`boto3`, `asyncpg`, `python-dotenv`など）

## マイグレーションスクリプトの作成手順

### 1. スクリプトファイルの作成

新しいマイグレーションスクリプトを作成する際は、以下のテンプレートを使用してください：

```python
#!/usr/bin/env python3
"""
Database migration script for [機能名]
"""

import asyncio
import os
import sys

# Add the parent directory to the path so we can import from authentication
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from authentication.data_access.database_pool import get_pool_manager

async def run_migration():
    """Run the database migration"""
    
    print("🚀 Starting [機能名] migration...")
    
    # Get the pool manager (same as backend)
    pool_manager = get_pool_manager()
    
    try:
        print("🔗 Connecting to database using pool manager...")
        
        # Initialize the pool
        await pool_manager.initialize_pool()
        print("✅ Pool initialized")
        
        # Get a connection from the pool
        async with pool_manager.get_connection() as conn:
            async with conn.transaction():
                print("📝 Checking if migration is needed...")
                
                # Check if column/table already exists
                column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = 'TableName'
                        AND column_name = 'ColumnName'
                    );
                """)
                
                if column_exists:
                    print("✅ Column already exists")
                else:
                    # Add new column/table
                    print("🆕 Adding new column...")
                    await conn.execute("""
                        ALTER TABLE "TableName" 
                        ADD COLUMN "ColumnName" TYPE DEFAULT_VALUE;
                    """)
                    print("✅ Column added successfully")
                
                print("\n🚀 Migration completed successfully!")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        # Close the pool
        if pool_manager._pool:
            await pool_manager._pool.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
```

### 2. スクリプトの実行

#### 方法1: Dockerコンテナ内で実行（推奨）

```bash
# 1. スクリプトをDockerコンテナにコピー
docker cp scripts/your_migration_script.py utjn-website-api-1:/app/

# 2. Dockerコンテナ内でスクリプトを実行
docker exec -it utjn-website-api-1 python /app/your_migration_script.py
```

#### 方法2: ローカルで実行（環境変数が正しく設定されている場合）

```bash
python scripts/your_migration_script.py
```

## 既存のマイグレーションスクリプト

### add_admin_permission.py

**目的**: Admin権限管理機能の追加

**実行内容**:
- `User`テーブルに`isAdmin`カラムを追加
- 初期Adminユーザー（`koseiuemura1227@gmail.com`）を設定

**実行方法**:
```bash
# Dockerコンテナにコピー
docker cp scripts/add_admin_permission.py utjn-website-api-1:/app/

# 実行
docker exec -it utjn-website-api-1 python /app/add_admin_permission.py
```

### migrate_forms.py

**目的**: フォームの公開アクセス機能の追加

**実行内容**:
- `Form`テーブルに`accessToken`と`allowPublicAccess`カラムを追加
- 既存フォームにアクセストークンを生成

**実行方法**:
```bash
# Dockerコンテナにコピー
docker cp scripts/migrate_forms.py utjn-website-api-1:/app/

# 実行
docker exec -it utjn-website-api-1 python /app/migrate_forms.py
```

## 注意事項

1. **バックアップ**: マイグレーション実行前にデータベースのバックアップを取得してください
2. **テスト環境**: 本番環境で実行する前に、テスト環境でマイグレーションをテストしてください
3. **ロールバック**: 必要に応じてロールバックスクリプトも作成してください
4. **依存関係**: マイグレーションスクリプトは`authentication`モジュールに依存しているため、Dockerコンテナ内で実行することを推奨します

## トラブルシューティング

### よくあるエラー

1. **ModuleNotFoundError**: 必要なパッケージがインストールされていない
   ```bash
   pip install boto3 asyncpg python-dotenv
   ```

2. **DATABASE_URL not found**: 環境変数が設定されていない
   - Dockerコンテナ内で実行することを確認
   - または、ローカルの`.env`ファイルにDATABASE_URLが設定されていることを確認

3. **Connection failed**: データベース接続エラー
   - Dockerコンテナが起動していることを確認
   - データベースの認証情報が正しいことを確認

### ログの確認

マイグレーション実行時のログを確認して、エラーの詳細を把握してください：

```bash
# Dockerコンテナのログを確認
docker logs utjn-website-api-1
```

## 新しいマイグレーションの追加

新しいマイグレーションを追加する際は、以下の手順に従ってください：

1. このREADMEファイルを更新して、新しいマイグレーションの説明を追加
2. スクリプトファイルに適切なコメントを追加
3. テスト環境で実行して動作を確認
4. 本番環境で実行

## 関連ファイル

- `authentication/data_access/database_pool.py`: データベース接続プール管理
- `authentication/data_access/user_repository.py`: ユーザー関連のデータベース操作
- `authentication/data_access/form_repository.py`: フォーム関連のデータベース操作 