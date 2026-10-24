# 画風調合工房（style-blending-workshop）

PIXAI・NovelAI 向けに、**画風・描線・塗り・光・陰影・色彩・質感・特殊効果**のタグを強度つきで調合して、プロンプトを作る静的Webアプリです。顔立ち・容姿・服装・ポーズは扱いません。アーティストタグ・作品名による画風指定も扱いません。

公開URL（想定）：https://nyuriwossan.github.io/style-blending-workshop/

- サーバー不要／APIキー不要／アカウント登録不要
- iPhone Safari 中心、PCでは2カラム表示
- 端末内（localStorage）に自動保存、JSONでバックアップ

> **注意**：基礎の329タグは元調査成果物の完全復元ではなく**再構築版**です。v1.1 で NovelAI 公式資料に掲載されたタグを69件追加しました（計398件）。**公式資料への掲載と、画像生成での効果確認は別の情報**として扱い、全タグについて画像での効果は未検証と表示します。

## v1.2 の変更点（品質調合・仕上げディテール）

プロンプトを3つの層に分けて組み立てられるようになりました。**画風を作る → 目・髪・肌などの描き込みを整える → 必要なら品質タグを足す → 完成レシピとして保存する**、という流れを想定しています。

| 層 | 内容 | 画面 |
|---|---|---|
| 画風調合 | 従来の9カテゴリ・398タグ・36プリセット・年タグ・複雑度 | 調合画面の下半分（主役） |
| 品質調合（新規） | 品質評価・美的評価・解像感・描き込み密度・補助（no text）の28タグ | よく使う6タグのチップ＋「詳細設定」で全タグと強度 |
| 仕上げディテール（新規） | 目・髪・肌・唇・衣服・全体の47タグ（基本24件） | 「高度な設定｜仕上げディテール」。初回は閉じ、開閉は端末に記憶 |

- **重複の整理**：英語プロンプトが同じタグは3層を通して1つのID（`high detail`・`highly detailed`・`intricate details` は品質と仕上げの両方から選べるが、出力は1回だけ）。表現の違うタグは統合しない。
- **自動品質タグ**：NovelAI・PIXAI側の「品質タグ追加」を自己申告で選ぶと、手動で選んだタグとの重複を知らせる（アプリの出力からは削除しない）。V5 の Light/Standard ほか、公式資料にある各版の自動タグを収録。
- **モデル対応**：`masterpiece` は NovelAI V4.5 以上の公式タグなので V3/V4 には出力しない。`top aesthetic` は公式資料の間で食い違いがあるため V4.5 以降では「未検証」として扱う。
- **出力の並び**：おまかせでは PIXAI は「品質 → 画風 → 仕上げ」、NovelAI は「画風 → 仕上げ → 品質」（NovelAI の自動品質タグも末尾に付くため）。設定で変更可。品質・仕上げが空なら v1.1 と同じ出力。
- **Tsubaki**：仕上げディテールは自然文テンプレート（実験的、短いタグ形式にも切替可）。品質タグは強度を付けずに出力。
- **コピー**：全体／画風だけ／品質だけ／仕上げだけ／画風＋仕上げ／画風＋品質＋仕上げ。
- **プリセット**：品質8種（手動で出力するもの）と、自動品質タグの設定を記録するだけのもの（出力しない）を区別。仕上げ6種。どれも他の層を変えない。
- **保存**：レシピに3層を保存。「一部だけ読み込む」で画風／品質／仕上げのどれかだけを再利用。グループ棚に品質・仕上げのセットも保存できる。schemaVersion 3（v1.0・v1.1 のデータはそのまま読める）。
- 収録タグ・根拠・採否の一覧：[docs/quality-detail-tags.md](docs/quality-detail-tags.md)

## v1.1 の変更点

- **NovelAI公式タグの拡充**：公式「Prompting for Unique Artstyles」「Tagging」「Strengthening & Weakening」と照合し、未収録の69件を追加（既存の329件・ID・内容は未変更）。照合の全結果は [docs/nai-official-reconciliation.md](docs/nai-official-reconciliation.md)
- **NAI公式掲載の表示と絞り込み**：「NAI公式」バッジ、「NAI公式掲載のみ」フィルター、照合日・出典・モデル別対応の表示、公式の代替表現や日本語での別名検索
- **V5専用タグの制御**：複雑度・depthness・meta:novel era などは V5 以外では出力せず、選択は保持（V5に戻すと復元）
- **複雑度**：指定なし／低／中／高／最高の排他選択（V5専用、強度なし）
- **年タグ**：`year 2024` 形式、複数年・個別強度・ON/OFF・削除。PIXAI向けは既定で出力せず、実験モードでのみ出力
- **基本表示**：ligne claire など14件を追加（72→86件）
- **リセット**：調合画面の上部に「調合をリセット」を追加。出力画面と共通の処理で、通知から「元に戻す」も可能
- **保存データ**：schemaVersion 2。v1.0 のデータはそのまま読み込める（実際の v1.0 ビルドで作った保存データでテスト済み）

## 主な機能

| 画面 | できること |
|---|---|
| 調合 | 9カテゴリ・基本86件／詳細398件、NAI公式掲載のみの絞り込み、年代・複雑度（NovelAI）、上部のリセット、日英・ひらがな検索、タグごとのON/OFFと強度（0〜1.6、0.1刻み、±ボタン付き）、調合皿（選択中タグの一覧）、関係の警告・相性候補 |
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

- **V5専用**（複雑度・depthness・meta:novel era・meta:golden era・visual novel art/cg）は NovelAI V5 にだけ出力します。他の出力先では除外して「非対応」と表示し、選択は保持します。
- **年タグ** `year 2024`：NovelAI 各版は上表と同じ強調構文。PIXAI向けは既定で出力せず、「出力の設定」の実験モードでのみ出力（Tsubaki の自然言語方式では強度を付けない）。
- **複雑度** `high complexity` など：V5 のみ、強度なしで1つだけ出力。
- **(medium) など括弧を含む公式タグ**：NovelAI ではそのまま。PIXAI SDXL（と Tsubaki 数値の実験モード）では、重み構文と衝突しないよう `watercolor \(medium\)` のように括弧をエスケープし、PIXAIでの解釈は未確認と警告します。
- ネガティブプロンプトはどの出力先でも生成しません。
- PIXAI向けでは `adult`・`bust` を含む表現を出力しません（自作タグに含まれる場合は除外して警告。人物プロンプト欄は書き換えず警告のみ）。
- 同じタグIDが複数グループにある場合は1回だけ出力し、採用値は「上のグループを優先（既定）／最大値／最小値」から選べます。値は加算しません。意味が似た別タグは統合しません。
- スライダー値は画像上の効果量ではありません。モデル間の等価性も保証しません。

## 構成

```
data/                    データ辞書（ここを更新すればタグを増やせる）
  style_tags.json        329タグ（再構築版・REC-* ID）※内容は未改変
  style_tags_nai_official.json  v1.1：NovelAI公式掲載タグ69件（NAI-* ID・出典・照合日・モデル対応）
  nai_official_reconciliation.json  v1.1：公式ページ全タグの照合結果（一致・追加・専用UI・除外と理由）
  relation_rules_nai.json  v1.1：公式資料に根拠のある関係（代替表現・表記揺れ・組み合わせ提案）
  quality_tags.json        v1.2：品質調合 28件（QLT-*）
  detail_tags.json         v1.2：仕上げディテール 44件（DTL-*）＋品質と共有する3件の参照
  quality_presets.json / detail_presets.json  v1.2：品質・仕上げのプリセット
  layer_relations.json     v1.2：品質・仕上げの関係（同じ尺度の反対側・表記揺れ・改称）
  layer_reconciliation.json  v1.2：候補の採否と理由、NovelAI の自動品質タグ一覧
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
scripts/build-nai-official.py 公式照合データの生成元（照合日・タグ・説明文を定義）
scripts/recon-to-md.mjs  照合結果を docs/nai-official-reconciliation.md に書き出す
scripts/build-layers.py  品質・仕上げの辞書の生成元（タグ・説明・根拠・リスク・テンプレート）
scripts/layers-to-md.mjs 収録一覧を docs/quality-detail-tags.md に書き出す
tests/fixtures/          v1.0・v1.1 の実ビルドで作った保存データ（互換性テスト用）
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

## 公式資料を再照合するとき

1. 公式ページを確認し、`scripts/build-nai-official.py` のタグ・説明・照合日（`CHECKED`）を更新
2. `python3 scripts/build-nai-official.py && node scripts/recon-to-md.mjs`
3. `npm run validate-data && npm test`

## 保存データ

- `localStorage` の `sbw.state.v1` に `schemaVersion: 3` 付きで保存（v1.0 は 1、v1.1 は 2。読み込み時に年タグ・複雑度・品質・仕上げなどを初期値で補って移行。キー名は互換のため据え置き）
- パネルの開閉などの端末ごとのUI設定は `sbw.ui.v1` に別保存（レシピ・バックアップには含めない。リセットしても変わらない）
- レシピの知らない項目は `extra` に退避して保持し、書き出しにも残す
- 読めないデータ・新しい版のデータは消さずに別キーへ退避
- 書き出しJSON：`{ app, kind: backup|recipe|group, schemaVersion, dictionary, exportedAt, ... }`
- 読み込みは「追加」が基本（同じIDは別IDで追加、上書きしない）。完全復元は置き換え前の状態を1世代退避

## 公開（GitHub Pages）

リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。`main` に push すると `.github/workflows/deploy.yml` が検査・テスト・ビルド・公開を行います。
