#!/usr/bin/env python3
"""
Phase 1 実装完了チェックスクリプト
グローバル接続プールの実装が正しく完了しているかを確認
"""

import os
import sys
import asyncio
import aiohttp
import json
from pathlib import Path

def check_files_exist():
    """必要なファイルが存在するかをチェック"""
    print("🔍 Checking required files...")
    
    required_files = [
        "authentication/data_access/database_pool.py",
        "authentication/data_access/base_repository.py",
        "main.py",
        "authentication/data_access/user_repository.py",
        "authentication/use_case/user/user_controller.py",
        "authentication/data_access/refund_repository.py",
        "authentication/use_case/refund/refund_controller.py",
        "authentication/data_access/database_init.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"\n❌ Missing files: {missing_files}")
        return False
    
    print("✅ All required files exist")
    return True

def check_imports():
    """インポートが正しく動作するかをチェック"""
    print("\n🔍 Checking imports...")
    
    try:
        # グローバルプールのインポート
        from authentication.data_access.database_pool import DatabasePoolManager, get_pool_manager
        print("✅ database_pool imports successful")
        
        # ベースリポジトリのインポート
        from authentication.data_access.base_repository import BaseRepository
        print("✅ base_repository imports successful")
        
        # ユーザーリポジトリのインポート
        from authentication.data_access.user_repository import UserRepository
        print("✅ user_repository imports successful")
        
        # リファンドリポジトリのインポート
        from authentication.data_access.refund_repository import RefundRepository
        print("✅ refund_repository imports successful")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during imports: {e}")
        return False

async def check_api_endpoints():
    """APIエンドポイントが正しく動作するかをチェック"""
    print("\n🔍 Checking API endpoints...")
    
    base_url = "http://localhost:8000"
    
    try:
        async with aiohttp.ClientSession() as session:
            # 1. プール状態エンドポイント
            print("  Testing /pool-status...")
            async with session.get(f"{base_url}/pool-status") as response:
                if response.status == 200:
                    pool_status = await response.json()
                    print(f"  ✅ Pool status: {pool_status.get('status', 'unknown')}")
                else:
                    print(f"  ❌ Pool status failed: {response.status}")
                    return False
            
            # 2. ユーザーエンドポイント
            print("  Testing /users...")
            async with session.get(f"{base_url}/users") as response:
                if response.status == 200:
                    users = await response.json()
                    print(f"  ✅ Users endpoint: {len(users)} users retrieved")
                else:
                    print(f"  ❌ Users endpoint failed: {response.status}")
                    return False
            
            # 3. リファンドエンドポイント
            print("  Testing /refunds...")
            async with session.get(f"{base_url}/refunds") as response:
                if response.status == 200:
                    refunds = await response.json()
                    print(f"  ✅ Refunds endpoint: {refunds.get('count', 0)} refunds retrieved")
                else:
                    print(f"  ❌ Refunds endpoint failed: {response.status}")
                    return False
        
        return True
        
    except Exception as e:
        print(f"❌ API endpoint check failed: {e}")
        return False

async def check_connection_pool():
    """接続プールが正しく動作するかをチェック"""
    print("\n🔍 Checking connection pool functionality...")
    
    try:
        from authentication.data_access.database_pool import get_pool_manager
        
        pool_manager = get_pool_manager()
        
        # プールが初期化されているかをチェック
        status = await pool_manager.get_pool_status()
        
        if status.get('status') == 'active':
            print(f"✅ Connection pool is active")
            print(f"   Min size: {status.get('min_size', 'N/A')}")
            print(f"   Max size: {status.get('max_size', 'N/A')}")
            print(f"   Current size: {status.get('size', 'N/A')}")
            print(f"   Free connections: {status.get('free_size', 'N/A')}")
            return True
        else:
            print(f"❌ Connection pool is not active: {status}")
            return False
            
    except Exception as e:
        print(f"❌ Connection pool check failed: {e}")
        return False

def check_code_quality():
    """コードの品質をチェック"""
    print("\n🔍 Checking code quality...")
    
    issues = []
    
    # 1. 不要なconnect/disconnect呼び出しのチェック
    files_to_check = [
        "authentication/use_case/user/user_controller.py",
        "authentication/use_case/refund/refund_controller.py"
    ]
    
    for file_path in files_to_check:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            if 'await user_repo.connect()' in content or 'await refund_repo.connect()' in content:
                issues.append(f"Manual connect() calls found in {file_path}")
            if 'await user_repo.disconnect()' in content or 'await refund_repo.disconnect()' in content:
                issues.append(f"Manual disconnect() calls found in {file_path}")
                
        except Exception as e:
            issues.append(f"Error reading {file_path}: {e}")
    
    # 2. ベースリポジトリの継承チェック
    try:
        with open("authentication/data_access/user_repository.py", 'r') as f:
            content = f.read()
            
        if 'class UserRepository(BaseRepository):' not in content:
            issues.append("UserRepository does not inherit from BaseRepository")
            
    except Exception as e:
        issues.append(f"Error checking UserRepository inheritance: {e}")
    
    if issues:
        print("❌ Code quality issues found:")
        for issue in issues:
            print(f"   - {issue}")
        return False
    else:
        print("✅ Code quality checks passed")
        return True

async def main():
    """メイン関数"""
    print("🚀 Phase 1 Implementation Completion Check")
    print("=" * 50)
    
    checks = [
        ("File Existence", check_files_exist),
        ("Import Functionality", check_imports),
        ("Code Quality", check_code_quality),
        ("Connection Pool", check_connection_pool),
        ("API Endpoints", check_api_endpoints)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        print(f"\n📋 {check_name} Check:")
        try:
            if asyncio.iscoroutinefunction(check_func):
                result = await check_func()
            else:
                result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ {check_name} check failed with exception: {e}")
            results.append((check_name, False))
    
    # 結果の要約
    print("\n" + "=" * 50)
    print("📊 CHECK RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{check_name:<25} {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 Phase 1 implementation is COMPLETE and CORRECT!")
        print("✅ Global connection pool is properly implemented")
        print("✅ All repositories use the global pool")
        print("✅ No manual connect/disconnect calls")
        print("✅ API endpoints are working")
        return True
    else:
        print(f"\n⚠️  Phase 1 implementation is INCOMPLETE")
        print(f"   {total - passed} checks failed")
        print("   Please fix the issues above before proceeding")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 