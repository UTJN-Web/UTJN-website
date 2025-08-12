#!/usr/bin/env python3
"""
グローバル接続プールのパフォーマンステストスクリプト
"""

import asyncio
import time
import aiohttp
import json

async def test_pool_performance():
    """接続プールのパフォーマンスをテスト"""
    
    # テスト用のエンドポイント
    base_url = "http://localhost:8000"
    
    print("🚀 Starting connection pool performance test...")
    
    # 1. プール状態を確認
    print("\n1. Checking pool status...")
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{base_url}/pool-status") as response:
            if response.status == 200:
                pool_status = await response.json()
                print(f"✅ Pool status: {json.dumps(pool_status, indent=2)}")
            else:
                print(f"❌ Failed to get pool status: {response.status}")
    
    # 2. 複数のリクエストを並行実行してパフォーマンスをテスト
    print("\n2. Testing concurrent requests...")
    
    async def make_request(session, request_id):
        """単一のリクエストを実行"""
        start_time = time.time()
        
        # ユーザー一覧を取得
        async with session.get(f"{base_url}/users") as response:
            end_time = time.time()
            duration = (end_time - start_time) * 1000  # ミリ秒
            
            if response.status == 200:
                data = await response.json()
                user_count = len(data) if isinstance(data, list) else 0
                print(f"✅ Request {request_id}: {duration:.2f}ms - {user_count} users")
                return duration, True
            else:
                print(f"❌ Request {request_id}: {duration:.2f}ms - Failed ({response.status})")
                return duration, False
    
    # 10個の並行リクエストを実行
    start_time = time.time()
    async with aiohttp.ClientSession() as session:
        tasks = [make_request(session, i) for i in range(1, 11)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    end_time = time.time()
    total_duration = (end_time - start_time) * 1000
    
    # 結果を分析
    successful_requests = [r for r in results if isinstance(r, tuple) and r[1]]
    failed_requests = [r for r in results if isinstance(r, tuple) and not r[1]]
    exceptions = [r for r in results if isinstance(r, Exception)]
    
    if successful_requests:
        durations = [r[0] for r in successful_requests]
        avg_duration = sum(durations) / len(durations)
        min_duration = min(durations)
        max_duration = max(durations)
        
        print(f"\n📊 Performance Results:")
        print(f"   Total requests: 10")
        print(f"   Successful: {len(successful_requests)}")
        print(f"   Failed: {len(failed_requests)}")
        print(f"   Exceptions: {len(exceptions)}")
        print(f"   Total time: {total_duration:.2f}ms")
        print(f"   Average response time: {avg_duration:.2f}ms")
        print(f"   Min response time: {min_duration:.2f}ms")
        print(f"   Max response time: {max_duration:.2f}ms")
        
        if avg_duration < 1000:
            print(f"   🎉 Excellent performance! Average response time: {avg_duration:.2f}ms")
        elif avg_duration < 3000:
            print(f"   ✅ Good performance! Average response time: {avg_duration:.2f}ms")
        else:
            print(f"   ⚠️  Slow performance! Average response time: {avg_duration:.2f}ms")
    
    if failed_requests:
        print(f"\n❌ Failed requests: {len(failed_requests)}")
    
    if exceptions:
        print(f"\n💥 Exceptions: {len(exceptions)}")
        for i, exc in enumerate(exceptions):
            print(f"   Exception {i+1}: {exc}")

if __name__ == "__main__":
    asyncio.run(test_pool_performance()) 