# 🀄 雀幻 · Majsoul Mirage

![Version](https://img.shields.io/badge/version-0.5.1-6366f1?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-00485B?style=flat-square&logo=tampermonkey&logoColor=white)

[English](README.md) | **日本語** | [简体中文](README.zh-CN.md)

雀魂 Web クライアントの装飾をローカルで変更する Tampermonkey ユーザースクリプトです。現在のバージョンは **0.5.1** です。

ネイティブ WebSocket メッセージをフックし、必要な protobuf フィールドを解析して表示を変更します。サーバー上の所持状況や、他のプレイヤーから見た表示は変わりません。

## ⚠️ 免責事項

**利用は自己責任です。本スクリプトの使用により、アカウントの機能制限、一時停止、永久停止（BAN）を受ける可能性があります。**

- ローカルの表示変更のみであっても、規約への適合、検出されないこと、アカウント処分を受けないことは保証しません。
- 利用前にゲームの適用規約・ルールを確認し、遵守する責任は利用者にあります。アカウントを利用できなくなるリスクを受け入れられない場合は使用しないでください。
- 本プロジェクトは現状のまま提供され、安全性、可用性、互換性を保証しません。適用法令で認められる範囲において、作者・貢献者はアカウント処分、データや購入済みコンテンツの喪失、その他利用に伴う損失について責任を負いません。アカウントの復旧や補償には対応しません。
- 非公式プロジェクトであり、ゲーム運営との提携、許可、推奨を受けたものではありません。

## ✨ 機能

- キャラクター、衣装、スタンプ、称号、ロード画像、装飾プリセットのローカル変更。
- ルーム、対局、アカウント、牌譜の表示変更。
- ローカルの候補からキャラクターと衣装をランダムに選択。
- 手動でのキャラクター・衣装変更を現在の選択に反映。ランダム候補は書き換えず、対局認証では再抽選しません。
- 簡潔な英語ログと、コピー可能なメッセージオブジェクト。メッセージ履歴キューは保持しません。

## 🛠️ ビルド

[最新の Release 成果物](https://github.com/anosora233/majsoul-mirage/releases/latest/download/majsoul-mirage.user.js)をインストールするか、以下の手順でビルドしてください。リソース更新と自動公開の詳細は[保守ドキュメント](docs/maintenance.md)を参照してください。

Node.js 24+、Python 3.10+ が必要です。依存関係とゲームリソースの初回取得にはネットワーク接続が必要です。

```sh
npm ci
python -m pip install -r requirements.txt
npm run resources:prepare
npm run build
npm test
npm run test:lua
```

ルートに `majsoul-mirage.user.js` が生成されます。最終成果物、生成 JSON、抽出 Lua、キャッシュは Git に含めません。Python と Lua はビルド・テスト専用です。ブラウザー側の外部実行依存は、Tampermonkey の `@require` で読み込む固定バージョンの protobuf.js light 8.8.1 のみです。

## 🚀 インストール

1. 生成された `.user.js` を Tampermonkey にインストールします。
2. 他の装飾フックスクリプトを無効にし、保存してゲームを再読み込みします。
3. ヘッダー全体を保持してください。特に `@run-at document-start`、`@sandbox raw`、`@grant none`、`@require` が必要です。

## 🔍 デバッグ

ゲームページのコンソールで `majsoulMirage` API を使用します。

```js
majsoulMirage.debug = 'NotifyAccountUpdate'; // メッセージ名の一部で絞り込み
majsoulMirage.debug = true;                 // 認識できる全メッセージを表示
majsoulMirage.debug = false;                // 初期値：内容を出力しない
majsoulMirage.log = 'all';                  // 通常の通過ログも表示
majsoulMirage.readOnly = true;              // 業務フックを適用せず解析
majsoulMirage.readOnly = false;             // 変更を再開
```

オブジェクトにはメッセージ情報と変更前後の内容が含まれます。ローカル処理するリクエストには応答と通知も含まれます。未定義メッセージは生バイトを表示します。ログにはアカウント・セッション情報が含まれる可能性があるため、共有前に伏せてください。ルームのローカル連番を変更した後に読み取り専用へ切り替える場合は、再読み込みして比較してください。

## 🔧 保守

```sh
npm run cfg:update
python scripts/update-cfg.py --offline --protocol
```

最初のコマンドは設定を更新し、次のコマンドは既存キャッシュからリソースを再生成します。エクスポーターはゲームリソース内の Lua を実行するため、信頼できる入力のみ使用してください。開発サーバーはありません。

| パス | 内容 |
| --- | --- |
| `src/` | WebSocket、装飾フック、設定・プロトコル変換 |
| `scripts/` | リソース抽出、プロトコル出力、ビルド |
| `tests/` | JavaScript 回帰テストとゲーム本来の Lua デコーダー検証 |
| `data/` | 生成されるビルド入力とディレクトリ説明 |
| `docs/` | 英語の使用・保守・検証ドキュメント |

[使用方法](docs/usage.md)、[保守](docs/maintenance.md)、[検証記録](docs/validation.md)、[貢献ガイド](AGENTS.md)も参照してください。自動テストの成功は将来の全更新への対応を保証せず、実際のゲーム画面での確認も必要です。本プロジェクトは雀魂公式とは関係ありません。

## 🤝 謝辞

本プロジェクトは主に [anosora233/majsoul-hook-mitm](https://github.com/anosora233/majsoul-hook-mitm) のメッセージフックとローカル装飾処理の考え方を参考にしています。作者および貢献者の皆様に感謝します。
