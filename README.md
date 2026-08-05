# ヒヤリハット記録アプリ

作業訓練現場向け ヒヤリハット記録・自動集計・AI分析Webアプリ。
設計の詳細は「ヒヤリハット記録アプリ_詳細設計書.md」を参照（本プロジェクトの唯一の仕様書）。

## セットアップ（Vercel経由）

1. このリポジトリをVercelにインポート
2. Vercelのプロジェクト設定 > Environment Variables に `.env.example` の項目をすべて登録
3. main（または任意のデプロイ対象ブランチ）へのpushで自動デプロイ

## ディレクトリ構成

```
src/
  app/         Next.js App Router（画面はPhase 1以降で追加）
  components/  共通コンポーネント（Task 0-5で追加）
  lib/         Firebase等の初期化・共通ロジック
  types/       型定義（Task 0-2で追加）
```

## 現在の状態

Phase 0〜5実装済み（PDF生成含む）。

## フォントライセンス

掲示用PDF生成には Noto Sans JP（`src/assets/fonts/NotoSansJP-Variable.ttf`）を使用しています。
Noto Sans JP は SIL Open Font License, Version 1.1（OFL）のもとで配布されています。
ライセンス全文は `src/assets/fonts/OFL.txt` を参照してください。
配布元：https://github.com/google/fonts/tree/main/ofl/notosansjp


