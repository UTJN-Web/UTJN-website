#!/usr/bin/env python3
"""
シンプルな修正スクリプト
残りのconnect/disconnectを削除
"""

import re

def remove_connect_disconnect(file_path):
    """ファイルからconnect/disconnectを削除"""
    print(f"🔧 Fixing {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # connect/disconnectを削除
        content = re.sub(r'await \w+_repo\.connect\(\)\s*\n', '', content)
        content = re.sub(r'await \w+_repo\.disconnect\(\)\s*\n', '', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Fixed {file_path}")
        
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")

def main():
    """メイン関数"""
    files_to_fix = [
        "authentication/use_case/refund/refund_controller.py",
        "authentication/use_case/event/event_controller.py",
        "authentication/use_case/form/form_controller.py"
    ]
    
    for file_path in files_to_fix:
        remove_connect_disconnect(file_path)
    
    print("\n🎉 Simple fixes completed!")

if __name__ == "__main__":
    main() 