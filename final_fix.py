#!/usr/bin/env python3
"""
最終修正スクリプト
残りのself.poolの使用を全て修正
"""

import re

def fix_remaining_pool_usage():
    """残りのself.poolの使用を修正"""
    
    files_to_fix = [
        "authentication/data_access/refund_repository.py",
        "authentication/data_access/event_repository.py",
        "authentication/data_access/form_repository.py"
    ]
    
    for file_path in files_to_fix:
        print(f"🔧 Fixing {file_path}...")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # self.pool.acquire()をself.get_connection()に変更
            content = re.sub(
                r'async with self\.pool\.acquire\(\) as conn:',
                'async with self.get_connection() as conn:',
                content
            )
            
            # self.poolチェックを削除
            content = re.sub(
                r'if not self\.pool:\s+raise Exception\("Database not connected"\)',
                '',
                content
            )
            
            # connect/disconnectメソッドを削除
            content = re.sub(
                r'async def connect\(self\):.*?async def disconnect\(self\):.*?await self\.pool\.close\(\)',
                '# connect() and disconnect() methods are now handled by BaseRepository\n    # No need to implement them as the global pool is managed centrally',
                content,
                flags=re.DOTALL
            )
            
            # self.pool = await asyncpg.create_pool()を削除
            content = re.sub(
                r'self\.pool = await asyncpg\.create_pool\(database_url\)',
                '# Pool creation is now handled by BaseRepository',
                content
            )
            
            # self.pool = Noneを削除
            content = re.sub(
                r'self\.pool = None',
                '# Pool is now managed by BaseRepository',
                content
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Fixed {file_path}")
            
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")

def main():
    """メイン関数"""
    print("🚀 Final Phase 1 Fixes")
    print("=" * 50)
    
    fix_remaining_pool_usage()
    
    print("\n" + "=" * 50)
    print("🎉 Final fixes completed!")
    print("✅ Phase 1 implementation should now be COMPLETE")
    print("\nNext steps:")
    print("1. Test the application")
    print("2. Run performance tests")

if __name__ == "__main__":
    main() 