# Check User Payments Script

## 概要

`check_user_payments.py` は、Square決済システムとデータベースの同期を確認し、未登録の決済を特定するための診断スクリプトです。

## 目的

- 特定ユーザーの決済状況を詳細に分析
- データベースに登録されていない決済を検出
- 決済システムの同期問題を特定
- 損失額の計算

## 機能

### 1. 登録済み決済の確認
- 指定されたユーザーの登録済み決済をデータベースから取得
- Square APIを呼び出して生の決済トランザクションオブジェクトを取得
- ユーザー識別子（`customer_id`, `order_id`）を収集

### 2. 未登録決済の検出
- 同じユーザー（同じ`customer_id`または`order_id`）の未登録決済を検索
- 指定された日付範囲内の決済を対象
- 完了済み（`COMPLETED`）の決済のみを対象

### 3. 詳細な分析情報
- 決済ID、作成日時、金額
- カード情報（ブランド、末尾4桁）
- 顧客ID、注文ID
- 生のSquare決済オブジェクト

## 使用方法

### 基本的な使用方法

```bash
# 特定のユーザーの決済をチェック
python check_user_payments.py --emails user@example.com

# 特定の日付範囲を指定
python check_user_payments.py --emails user@example.com --start-date 2025-08-01 --end-date 2025-08-31

# すべての登録済み決済をチェック
python check_user_payments.py
```

### コマンドライン引数

| 引数 | 説明 | 必須 | デフォルト |
|------|------|------|------------|
| `--emails` | 対象ユーザーのメールアドレス（複数指定可能） | 任意 | すべてのユーザー |
| `--start-date` | 検索開始日（YYYY-MM-DD形式） | 任意 | 30日前 |
| `--end-date` | 検索終了日（YYYY-MM-DD形式） | 任意 | 今日 |

### 使用例

```bash
# Tamimaさんの8月の決済をチェック
python check_user_payments.py --emails tamima.wadageri@mail.utoronto.ca --start-date 2025-08-01 --end-date 2025-08-31

# 複数ユーザーの決済をチェック
python check_user_payments.py --emails user1@example.com user2@example.com

# 過去7日間のすべての決済をチェック
python check_user_payments.py --start-date 2025-08-25
```

## 出力例

```
Target emails: ['tamima.wadageri@mail.utoronto.ca']
Start date: 2025-08-01
End date: 2025-08-31
🔍 Checking raw Square Payment Transaction objects
================================================================================
Found 1 registered payments to check:
  - tamima.wadageri@mail.utoronto.ca: fNBVyOUOaxkXj6LtALISDpLLRJNZY (運動会　2次会)

🔍 Checking registered payments with Square API:
📋 Payment ID: fNBVyOUOaxkXj6LtALISDpLLRJNZY
   User: tamima.wadageri@mail.utoronto.ca
   Event: 運動会　2次会
   Registered: 2025-08-30 01:25:08.130760
   Customer ID: YZRJPTGJ1SZ4EF49Y7VR6E8VFW
   Order ID: UTKXgsqYf8OmOa10oFNGYULw64XZY

🚨 Checking for unregistered payments for the same user(s):
   Customer IDs: ['YZRJPTGJ1SZ4EF49Y7VR6E8VFW']
   Order IDs: ['UTKXgsqYf8OmOa10oFNGYULw64XZY']
📅 Searching payments from 2025-08-01 to 2025-08-31

❌ UNREGISTERED PAYMENT FOUND:
   Payment ID: 1KyZqA1fGzVrr3iTtbVxQGUUEKIZY
   Created: 2025-08-29T22:28:52.755Z
   Amount: $5.00 CAD
   Customer ID: YZRJPTGJ1SZ4EF49Y7VR6E8VFW

📊 Summary:
   Date range: 2025-08-01 to 2025-08-31
   Total payments checked: 84
   Unregistered payments for target user(s): 2
   Total lost revenue: $10.00 CAD
```

## 環境設定

### 必要な環境変数

```bash
# データベース接続
DATABASE_URL=postgresql://postgres:password@host:5432/database

# Square API認証
SQUARE_ACCESS_TOKEN=your_square_access_token
```

### 必要なPythonパッケージ

```bash
pip install asyncpg requests
```

## 技術仕様

### データベース接続
- **ライブラリ**: `asyncpg`
- **接続**: 非同期接続
- **クエリ**: PostgreSQL

### Square API
- **バージョン**: 2024-07-17
- **認証**: Bearer Token
- **エンドポイント**: `/v2/payments`
- **ページネーション**: Cursor-based

### フィルタリングロジック
1. 登録済み決済から`customer_id`と`order_id`を収集
2. 同じ識別子を持つ決済を検索
3. データベースに存在しない決済を未登録として特定

## トラブルシューティング

### よくある問題

1. **SQUARE_ACCESS_TOKEN not found**
   - 環境変数が設定されていない
   - 解決策: `export SQUARE_ACCESS_TOKEN=your_token`

2. **Square API Error**
   - API認証エラー
   - 解決策: トークンの有効性を確認

3. **Database connection error**
   - データベース接続エラー
   - 解決策: `DATABASE_URL`の確認

### デバッグ方法

```bash
# 詳細なエラー情報を表示
python check_user_payments.py --emails user@example.com 2>&1 | tee debug.log
```

## 分析のポイント

### 重要な指標

1. **未登録決済数**: データベースに登録されていない決済の数
2. **損失額**: 未登録決済の合計金額
3. **時間的パターン**: 決済の時間的集中度
4. **カード情報**: 同じカードの重複使用

### 異常パターンの検出

- **短時間での複数決済**: 重複決済の可能性
- **同じカードの複数使用**: システムの問題
- **異なるOrder ID**: 決済処理の不整合

## 運用上の注意点

1. **定期的な実行**: 週次または月次での定期実行を推奨
2. **結果の記録**: 実行結果をログとして保存
3. **アラート設定**: 異常な結果が出た場合の通知
4. **データ保護**: 個人情報の取り扱いに注意

## 修正された問題

### 1. 冪等性の問題（2025年1月修正）
- **問題**: `idempotency_key`がランダム生成されていたため、重複決済が発生
- **修正**: 決定論的な`idempotency_key`を使用（`${userId}-${eventId}-${timestamp}`）
- **効果**: 同じ決済の重複処理を防止

### 2. エラーハンドリングの改善
- **問題**: ネットワークエラーやタイムアウトの適切な処理が不十分
- **修正**: より詳細なエラーメッセージと適切なHTTPステータスコード
- **効果**: ユーザーにより分かりやすいエラー情報を提供

### 3. 決済状態の確認強化
- **問題**: 既存決済の確認機能が不十分
- **修正**: 決済前の既存決済チェック機能を追加
- **効果**: 重複決済の事前防止

## 今後の改善案

1. **自動化**: cronジョブでの定期実行
2. **Webhook連携**: リアルタイム監視
3. **ダッシュボード**: 結果の可視化
4. **自動修復**: 未登録決済の自動登録機能

## 連絡先

問題や質問がある場合は、開発チームまでお問い合わせください。

---

**最終更新**: 2025年1月
**バージョン**: 1.1
**作成者**: 開発チーム
**修正内容**: 冪等性の問題修正、エラーハンドリング改善
