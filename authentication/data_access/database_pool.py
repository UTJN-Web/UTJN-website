# authentication/data_access/database_pool.py
import os
import asyncpg
import boto3
import json
import logging
from typing import Optional
from contextlib import asynccontextmanager

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabasePoolManager:
    """
    グローバル接続プールマネージャー
    シングルトンパターンで実装し、アプリケーション全体で共有される接続プールを管理
    """
    
    _instance = None
    _pool = None
    _database_url = None
    _is_initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabasePoolManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # シングルトンのため、初期化は一度だけ
        if not self._is_initialized:
            self._is_initialized = True
    
    @classmethod
    def get_instance(cls):
        """シングルトンインスタンスを取得"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def _get_database_url_from_secrets(self) -> Optional[str]:
        """AWS Secrets ManagerからデータベースURLを取得（キャッシュ付き）"""
        if self._database_url:
            return self._database_url
        
        region_name = "us-east-2"
        
        # Create a Secrets Manager client
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name=region_name
        )
        
        # Try different possible secret names
        possible_secret_names = [
            "rdsdb-2454f7d1-b6f2-4366-95f6-1ccf8b4be221",  # Original
            "up_id",  # Existing secret
            "rdsdb",  # Simplified
            "database-credentials",  # Alternative
            "utjn-database",  # Another alternative
            "utjn-rds",  # Simple name
            "postgres-credentials"  # Very simple name
        ]
        
        for secret_name in possible_secret_names:
            try:
                get_secret_value_response = client.get_secret_value(
                    SecretId=secret_name
                )
                
                secret = get_secret_value_response['SecretString']
                secret_dict = json.loads(secret)
                
                # Check if this is a database secret (has required fields)
                required_fields = ['username', 'password', 'host', 'port', 'dbname']
                if all(field in secret_dict for field in required_fields):
                    # URLエンコードで安全な形式に
                    import urllib.parse
                    encoded_password = urllib.parse.quote_plus(secret_dict['password'])
                    
                    # DATABASE_URL を構築
                    database_url = f"postgresql://{secret_dict['username']}:{encoded_password}@{secret_dict['host']}:{secret_dict['port']}/{secret_dict['dbname']}"
                    
                    logger.info(f"✅ Successfully retrieved database secret: {secret_name}")
                    self._database_url = database_url
                    return database_url
                else:
                    logger.warning(f"⚠️ Secret '{secret_name}' exists but is not a database secret (missing required fields)")
                    continue
                
            except Exception as e:
                # Suppress error logs since fallback works
                continue
        
        # If all secrets fail, return None to fallback to environment variable
        logger.warning("⚠️ No valid database secret found in AWS Secrets Manager")
        return None
    
    def _get_database_url(self) -> str:
        """データベースURLを取得（キャッシュ付き）"""
        if self._database_url:
            return self._database_url
        
        # Try AWS Secrets Manager first
        database_url = self._get_database_url_from_secrets()
        if database_url:
            return database_url
        
        # Fallback to environment variable
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise Exception("DATABASE_URL environment variable not set and AWS Secrets Manager failed")
        
        logger.info("⚠️ Using DATABASE_URL from environment variable")
        self._database_url = database_url
        return database_url
    
    async def initialize_pool(self, min_size: int = 5, max_size: int = 20) -> None:
        """接続プールを初期化"""
        if self._pool:
            logger.info("✅ Connection pool already initialized")
            return
        
        try:
            database_url = self._get_database_url()
            
            # Extract components for safe logging (hide password)
            import re
            match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', database_url)
            if match:
                username, password, host, port, dbname = match.groups()
                safe_url = f"postgresql://{username}:***@{host}:{port}/{dbname}"
                logger.info(f"🔗 Database URL: {safe_url}")
            
            logger.info("🔌 Initializing global connection pool...")
            
            # 最適化された接続プール設定
            self._pool = await asyncpg.create_pool(
                database_url,
                min_size=min_size,           # 最小接続数
                max_size=max_size,           # 最大接続数
                command_timeout=60,          # コマンドタイムアウト
                server_settings={
                    'application_name': 'utjn_backend'  # アプリケーション名
                },
                setup=self._setup_connection  # 接続設定関数
            )
            
            logger.info(f"✅ Global connection pool initialized (min: {min_size}, max: {max_size})")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize connection pool: {e}")
            # プール初期化に失敗した場合、再試行を許可
            logger.warning("⚠️ Connection pool initialization failed, will retry on next request")
            self._pool = None
            raise e
    
    async def _setup_connection(self, connection):
        """接続の初期設定"""
        # 接続ごとの設定
        await connection.set_type_codec(
            'json',
            encoder=json.dumps,
            decoder=json.loads,
            schema='pg_catalog'
        )
    
    async def get_pool(self) -> asyncpg.Pool:
        """接続プールを取得"""
        if not self._pool:
            # プールが初期化されていない場合、自動的に初期化を試行
            logger.info("🔄 Connection pool not initialized, attempting to initialize...")
            try:
                await self.initialize_pool()
            except Exception as e:
                logger.error(f"❌ Failed to auto-initialize connection pool: {e}")
                raise Exception("Connection pool not initialized and auto-initialization failed.")
        return self._pool
    
    @asynccontextmanager
    async def get_connection(self):
        """接続を取得（コンテキストマネージャー）"""
        if not self._pool:
            # プールが初期化されていない場合、自動的に初期化を試行
            logger.info("🔄 Connection pool not initialized, attempting to initialize...")
            try:
                await self.initialize_pool()
            except Exception as e:
                logger.error(f"❌ Failed to auto-initialize connection pool: {e}")
                raise Exception("Connection pool not initialized and auto-initialization failed.")
        
        async with self._pool.acquire() as connection:
            yield connection
    
    async def close_pool(self) -> None:
        """接続プールを閉じる"""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("🔌 Global connection pool closed")
    
    async def get_pool_status(self) -> dict:
        """プールの状態を取得"""
        if not self._pool:
            return {"status": "not_initialized"}
        
        return {
            "status": "active",
            "min_size": self._pool.get_min_size(),
            "max_size": self._pool.get_max_size(),
            "size": self._pool.get_size(),
            "free_size": self._pool.get_free_size()
        }

# グローバルインスタンス
_pool_manager = None

def get_pool_manager() -> DatabasePoolManager:
    """グローバルプールマネージャーを取得"""
    global _pool_manager
    if _pool_manager is None:
        _pool_manager = DatabasePoolManager.get_instance()
    return _pool_manager

async def initialize_global_pool(min_size: int = 5, max_size: int = 20) -> None:
    """グローバル接続プールを初期化"""
    pool_manager = get_pool_manager()
    await pool_manager.initialize_pool(min_size, max_size)

async def close_global_pool() -> None:
    """グローバル接続プールを閉じる"""
    pool_manager = get_pool_manager()
    await pool_manager.close_pool()

async def get_global_pool() -> asyncpg.Pool:
    """グローバル接続プールを取得"""
    pool_manager = get_pool_manager()
    return await pool_manager.get_pool()

@asynccontextmanager
async def get_global_connection():
    """グローバル接続を取得（コンテキストマネージャー）"""
    pool_manager = get_pool_manager()
    async with pool_manager.get_connection() as connection:
        yield connection 