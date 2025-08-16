# authentication/data_access/base_repository.py
import logging
from contextlib import asynccontextmanager
from typing import Optional
from .database_pool import get_pool_manager, get_global_connection

logger = logging.getLogger(__name__)

class BaseRepository:
    """
    ベースリポジトリクラス
    グローバル接続プールを使用し、共通の接続管理機能を提供
    """
    
    def __init__(self):
        self._pool_manager = get_pool_manager()
        self._repository_name = self.__class__.__name__
    
    @property
    def pool_manager(self):
        """プールマネージャーを取得"""
        return self._pool_manager
    
    @asynccontextmanager
    async def get_connection(self):
        """接続を取得（コンテキストマネージャー）"""
        try:
            async with get_global_connection() as connection:
                yield connection
        except Exception as e:
            logger.error(f"❌ {self._repository_name}: Failed to get connection: {e}")
            raise e
    
    async def execute_query(self, query: str, *args, **kwargs):
        """クエリを実行"""
        async with self.get_connection() as conn:
            return await conn.execute(query, *args, **kwargs)
    
    async def fetch_query(self, query: str, *args, **kwargs):
        """クエリを実行して結果を取得"""
        async with self.get_connection() as conn:
            return await conn.fetch(query, *args, **kwargs)
    
    async def fetchval_query(self, query: str, *args, **kwargs):
        """クエリを実行して単一の値を取得"""
        async with self.get_connection() as conn:
            return await conn.fetchval(query, *args, **kwargs)
    
    async def fetchrow_query(self, query: str, *args, **kwargs):
        """クエリを実行して単一の行を取得"""
        async with self.get_connection() as conn:
            return await conn.fetchrow(query, *args, **kwargs)
    
    async def execute_transaction(self, queries: list):
        """トランザクション内で複数のクエリを実行"""
        async with self.get_connection() as conn:
            async with conn.transaction():
                results = []
                for query, *args in queries:
                    result = await conn.execute(query, *args)
                    results.append(result)
                return results
    
    async def check_table_exists(self, table_name: str) -> bool:
        """テーブルの存在をチェック"""
        query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        """
        return await self.fetchval_query(query, table_name)
    
    async def check_column_exists(self, table_name: str, column_name: str) -> bool:
        """カラムの存在をチェック"""
        query = """
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = $1
                AND column_name = $2
            );
        """
        return await self.fetchval_query(query, table_name, column_name)
    
    async def create_index_if_not_exists(self, table_name: str, column_name: str, index_name: Optional[str] = None):
        """インデックスを作成（存在しない場合のみ）"""
        if not index_name:
            index_name = f"idx_{table_name}_{column_name}"
        
        query = f"""
            CREATE INDEX IF NOT EXISTS {index_name} 
            ON "{table_name}"({column_name});
        """
        await self.execute_query(query)
        logger.info(f"✅ {self._repository_name}: Index {index_name} created/verified")
    
    async def add_column_if_not_exists(self, table_name: str, column_name: str, column_definition: str):
        """カラムを追加（存在しない場合のみ）"""
        exists = await self.check_column_exists(table_name, column_name)
        if not exists:
            query = f"""
                ALTER TABLE "{table_name}" 
                ADD COLUMN {column_name} {column_definition};
            """
            await self.execute_query(query)
            logger.info(f"✅ {self._repository_name}: Column {column_name} added to {table_name}")
        else:
            logger.info(f"✅ {self._repository_name}: Column {column_name} already exists in {table_name}")
    
    async def get_pool_status(self) -> dict:
        """プールの状態を取得"""
        return await self._pool_manager.get_pool_status()
    
    def log_operation(self, operation: str, details: str = ""):
        """操作をログに記録"""
        message = f"🔍 {self._repository_name}: {operation}"
        if details:
            message += f" - {details}"
        logger.info(message)
    
    def log_error(self, operation: str, error: Exception):
        """エラーをログに記録"""
        logger.error(f"❌ {self._repository_name}: {operation} failed - {error}")
    
    def log_success(self, operation: str, details: str = ""):
        """成功をログに記録"""
        message = f"✅ {self._repository_name}: {operation}"
        if details:
            message += f" - {details}"
        logger.info(message) 