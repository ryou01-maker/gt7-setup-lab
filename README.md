# GT7 Setup Lab

GT7 Setup Lab — Web app to generate and iterate car setups for Gran Turismo 7 (MVP).

概要
- 静的な HTML/CSS/JavaScript（Vanilla JS）で動作するシングルページアプリ。
- 車両データは手動でインポート/編集して管理します（自動スクレイピングは行いません）。
- セッティング生成、検証手順の自動生成、症状別トラブルシューティング、保存・比較・エクスポート/インポート機能を備えます。

実行方法（ローカル）
1. リポジトリをクローンするか、index.html をブラウザで開きます。
2. data/vehicles.more.sample.json を使って動��を確認してください。

GitHub Pages で公開する手順
1. リポジトリ > Settings > Pages を開く。
2. Source を "main" ブランチの "/ (root)" に設定して保存。
3. 数分で https://<your-username>.github.io/gt7-setup-lab/ に公開されます。

データの扱い
- 車両データは JSON または CSV でインポートできます。インポート時に "verified" フラグで公式確認済みかユーザー入力かを区別してください。
- localStorage を利用して保存します。ブラウザ/端末間の自動同期は行いません。

制限事項
- 公式 GT7 サイトからの自動取得は行いません。規約や技術的制約のため手動インポートが必要です。
- 推奨値は車両運動理論に基づく推定を含みます。ゲーム内での検証が必要であることを明記しています。

今後の拡張案
- 車種ごとの調整範囲データを収集して精度を高める
- 検証ログの共有（サーバー同期）
- 自動テレメトリ連携（GT7 が対応すれば）

