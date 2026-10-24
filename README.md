# 画風調合工房（style-blending-workshop）

PIXAI・NovelAI 向けに、**画風・描線・塗り・光・陰影・色彩・質感・特殊効果**のタグを強度つきで調合して、プロンプトを作る静的Webアプリです。顔立ち・容姿・服装・ポーズは扱いません。アーティストタグ・作品名による画風指定も扱いません。

公開URL（想定）：https://nyuriwossan.github.io/style-blending-workshop/

- サーバー不要／APIキー不要／アカウント登録不要
- iPhone Safari 中心、PCでは2カラム表示
- 端末内（localStorage）に自動保存、JSONでバックアップ

> **注意**：収録データは元調査成果物の完全復元ではなく**再構築版**です。全329タグについて、画像生成による効果は未検証です。アプリ内でも「未検証」として表示します。

## 主な機能

| 画面 | できること |
|---|---|
| 調合 | 9カテゴリ・基本72件／詳細329件、日英・ひらがな検索、タグごとのON/OFFと強度（0〜1.6、0.1刻み、±ボタン付き）、調合皿（選択中タグの一覧）、関係の警告・相性候補 |
| グループ | 同じカテゴリから何件でも選び、まとまりを「調合グループ」として扱う。名前変更・複製・削除・無効化・並べ替え・一括 ±0.1・グループ棚への保存 |
| プリセット | 36種。置き換え／編集中のグループに追加／新しいグループで追加。重複タグは「現在の値を残す／プリセットの値にする」を選択（加算しない） |
| 保存棚 | レシピの保存・上書き・読み込み・名前変更・複製・削除・単体書き出し、グループ棚、自作タグ、全体バックアップ（追加読み込み／完全復元／直前の状態に戻す） |
| 出力 | 7種の出力先、リアルタイムプレビュー、全体コピー、カテゴリ別コピー、人物プロンプトとの結合、並び順、重複の採用規則、リセット（元に戻す可） |

## 出力形式

| 出力先 | 0 | 1.0 | それ以外 | 根拠 |
|---|---|---|---|---|
| PIXAI SDXL系 | 出さない | `tag` | `(tag:1.2)`。既定で1.5を超える値は1.5に丸めて警告 | PixAI公式SDXLガイド（元調査報告書経由。今回は直接取得できず） |
| PIXAI Tsubaki.2 / .3 | 出さない | `tag` | `subtle` `gentle` `pronounced` `intense` を前置（model_output_rules.json の段階） | アプリ側のUX案。公式の数値換算ではない |
| 　〃 実験モード | 出さない | `tag` | `(tag:1.2)` | Tsubaki.3公式テンプレに数値付きの例が1件あるのみ。構文仕様は未確認 |
| NovelAI V4 / V4.5 / V5 | 出さない | `tag` | `1.2::tag ::` | NovelAI公式「Strengthening & Weakening」（2026-10-24 確認） |
| NovelAI V3（実験的） | 出さない | `tag` | `{}` / `[]` を `round(|ln w / ln 1.05|)` 段 | 同上（1段=1.05倍） |

- ネガティブプロンプトはどの出力先でも生成しません。
- PIXAI向けでは `adult`・`bust` を含む表現を出力しません（自作タグに含まれる場合は除外して警告。人物プロンプト欄は書き換えず警告のみ）。
- 同じタグIDが複数グループにある場合は1回だけ出力し、採用値は「上のグループを優先（既定）／最大値／最小値」から選べます。値は加算しません。意味が似た別タグは統合しません。
- スライダー値は画像上の効果量ではありません。モデル間の等価性も保証しません。

## 構成

```
data/                    データ辞書（ここを更新すればタグを増やせる）
  style_tags.json        329タグ（再構築版・REC-* ID）※内容は未改変
  style_presets.json     36プリセット ※未改変
  conflict_rules.json    53関係ルール ※未改変
  model_output_rules.json モデル別出力ルール ※未改変
  app_meta.json          表示用の補助データ（カテゴリ名・色・根拠ラベル等）※アプリ側で追加
src/core/                UIから独立したロジック
  dictionary.ts          辞書の読み込み・正規化・検索
  render.ts              変換エンジン（モデル別構文）
  relations.ts           関係判定（定義済みルールのみ）
  mix.ts                 調合・グループ・重複整理・プリセット適用
  schema.ts              保存データの検証・移行・インポート/エクスポート
src/storage/             端末内保存・ファイル入出力・コピー
src/ui/                  画面（React）
scripts/validate-data.mjs データ整合性チェック（ビルド前に自動実行）
tests/                   単体・回帰テスト（Vitest）
e2e/run.mjs              E2Eテスト（Playwright、iPhone 13相当・Pagesと同じサブパス）
docs/source-data/        添付ZIPの調査資料・CSV（参照用）
```

技術：TypeScript / React 18 / Vite 5 / Vitest / Playwright（E2Eのみ）

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm test             # 単体・回帰テスト
npm run build        # データ検査 → 型チェック → ビルド（dist/）
npm run e2e          # ビルド後に実行。Playwright と Chromium が必要
```

## タグを増やすとき

1. `data/style_tags.json` にレコードを追加（IDは `REC-XXX-000` 形式、既存IDは変えない）
2. 新しいサブカテゴリを使うなら `data/app_meta.json` の `subcategories` に表示名を追加
3. 関係があれば `data/conflict_rules.json` に追加（推測で作らない）
4. `npm run validate-data && npm test` が通ることを確認して push

保存済みレシピはタグIDと強度だけを持つので、英語表現を直しても壊れません。辞書から消えたIDは、読み込み時に「辞書にないタグ」として警告し、データは保持します。

## 保存データ

- `localStorage` の `sbw.state.v1` に `schemaVersion: 1` 付きで保存
- 読めないデータ・新しい版のデータは消さずに別キーへ退避
- 書き出しJSON：`{ app, kind: backup|recipe|group, schemaVersion, dictionary, exportedAt, ... }`
- 読み込みは「追加」が基本（同じIDは別IDで追加、上書きしない）。完全復元は置き換え前の状態を1世代退避

## 公開（GitHub Pages）

リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。`main` に push すると `.github/workflows/deploy.yml` が検査・テスト・ビルド・公開を行います。
