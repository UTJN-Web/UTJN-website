#!/usr/bin/env python3
"""
Phase 1 残り修正自動化スクリプト
残りのリポジトリとコントローラーの修正を自動化
"""

import os
import re
from pathlib import Path

def fix_refund_repository():
    """RefundRepositoryの残りの修正"""
    print("🔧 Fixing RefundRepository...")
    
    file_path = "authentication/data_access/refund_repository.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 残りのself.pool.acquire()を修正
    content = re.sub(
        r'async with self\.pool\.acquire\(\) as conn:',
        'async with self.get_connection() as conn:',
        content
    )
    
    # 残りのself.poolチェックを削除
    content = re.sub(
        r'if not self\.pool:\s+raise Exception\("Database not connected"\)',
        '',
        content
    )
    
    # 残りのprint文をログに変更
    content = re.sub(
        r'print\(f"✅ ([^"]+)"\)',
        r'self.log_success("\1")',
        content
    )
    
    content = re.sub(
        r'print\(f"❌ Error ([^"]+): {e}"\)',
        r'self.log_error("\1", e)',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ RefundRepository fixed")

def fix_event_repository():
    """EventRepositoryの修正"""
    print("🔧 Fixing EventRepository...")
    
    file_path = "authentication/data_access/event_repository.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # connect/disconnectメソッドを削除
    content = re.sub(
        r'async def connect\(self\):.*?async def disconnect\(self\):.*?await self\.pool\.close\(\)',
        '# connect() and disconnect() methods are now handled by BaseRepository\n    # No need to implement them as the global pool is managed centrally',
        content,
        flags=re.DOTALL
    )
    
    # self.pool.acquire()を修正
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
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ EventRepository fixed")

def fix_form_repository():
    """FormRepositoryの修正"""
    print("🔧 Fixing FormRepository...")
    
    file_path = "authentication/data_access/form_repository.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # connect/disconnectメソッドを削除
    content = re.sub(
        r'async def connect\(self\):.*?async def disconnect\(self\):.*?await self\.pool\.close\(\)',
        '# connect() and disconnect() methods are now handled by BaseRepository\n    # No need to implement them as the global pool is managed centrally',
        content,
        flags=re.DOTALL
    )
    
    # self.pool.acquire()を修正
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
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ FormRepository fixed")

def fix_refund_controller():
    """RefundControllerの残りの修正"""
    print("🔧 Fixing RefundController...")
    
    file_path = "authentication/use_case/refund/refund_controller.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # 残りのconnect/disconnect呼び出しを削除
    content = re.sub(
        r'await refund_repo\.connect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await refund_repo\.disconnect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await event_repo\.connect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await event_repo\.disconnect\(\)',
        '',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ RefundController fixed")

def fix_event_controller():
    """EventControllerの修正"""
    print("🔧 Fixing EventController...")
    
    file_path = "authentication/use_case/event/event_controller.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # connect/disconnect呼び出しを削除
    content = re.sub(
        r'await event_repo\.connect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await event_repo\.disconnect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await user_repo\.connect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await user_repo\.disconnect\(\)',
        '',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ EventController fixed")

def fix_form_controller():
    """FormControllerの修正"""
    print("🔧 Fixing FormController...")
    
    file_path = "authentication/use_case/form/form_controller.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # connect/disconnect呼び出しを削除
    content = re.sub(
        r'await form_repo\.connect\(\)',
        '',
        content
    )
    
    content = re.sub(
        r'await form_repo\.disconnect\(\)',
        '',
        content
    )
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ FormController fixed")

def main():
    """メイン関数"""
    print("🚀 Phase 1 Remaining Fixes Automation")
    print("=" * 50)
    
    fixes = [
        ("RefundRepository", fix_refund_repository),
        ("EventRepository", fix_event_repository),
        ("FormRepository", fix_form_repository),
        ("RefundController", fix_refund_controller),
        ("EventController", fix_event_controller),
        ("FormController", fix_form_controller)
    ]
    
    for fix_name, fix_func in fixes:
        try:
            fix_func()
        except Exception as e:
            print(f"❌ Error fixing {fix_name}: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 All fixes completed!")
    print("✅ Phase 1 implementation should now be complete")
    print("\nNext steps:")
    print("1. Run: python check_phase1_completion.py")
    print("2. Test the application")
    print("3. Run: python test_pool_performance.py")

if __name__ == "__main__":
    main() 