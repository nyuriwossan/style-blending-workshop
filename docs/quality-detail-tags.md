# 品質調合・仕上げディテール 収録一覧（v1.2）

照合日：2026-10-24

- 品質調合：28件（うち3件は仕上げディテールと共有）
- 仕上げディテール：専用44件＋共有3件＝47件（基本表示24件）
- 画像生成による効果検証：すべて未実施。公式資料への掲載・使用例とは別の情報として扱う。
- 対応の記号：公式＝公式資料に掲載、例＝公式の作例・テンプレートに使用例、×＝公式に別の版専用と記載（出力しない）、—＝記載なし・未検証（出力はする）。並びは NAI V3/V4/V4.5/V5・PIXAI SDXL/Tsubaki.2/Tsubaki.3。

## 出典区分

- `nai_special`：NovelAI公式の特殊タグ
- `official_example`：公式資料・テンプレートに同じ文字列の使用例
- `official_phrase`：公式の作例文の中に同じ語句（タグとしての掲載ではない）
- `community_usage`：公開作品などでの使用例（調査資料による。未確認）
- `research_candidate`：調査資料の候補（公式の使用例なし）

## 品質調合

| タグ | 日本語名 | 分類 | 出典区分 | 対応 | 根拠 |
|---|---|---|---|---|---|
| `best quality` | 最高の品質 | 品質評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI 例/—/例 | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：品質タグ（Quality Tags）に掲載<br>[NovelAI Docs – 品質タグ追加の切替え](https://docs.novelai.net/en/image/qualitytags/)：V4 Full・Anime V3 の自動品質タグに含まれる<br>[PixAI公式ブログ – プロンプトの書き方](https://blog.pixai.art/ja/how-to-write-pixai-prompts-formula-ja/)：定番セット masterpiece, best quality, high detail<br>[PixAI Docs – 生成ページガイド（品質タグ）](https://docs.pixai.art/ja/docs/tools/panel-tools)：品質タグの代表例<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：テンプレートの品質ブロックに使用例 |
| `amazing quality` | 素晴らしい品質 | 品質評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/例 | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：品質タグに掲載<br>[NovelAI Docs – 品質タグ追加の切替え](https://docs.novelai.net/en/image/qualitytags/)：V5 Light・V4 Curated・Anime V3 の自動品質タグに含まれる<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：テンプレートの品質ブロックに使用例 |
| `great quality` | 優良な品質 | 品質評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：品質タグに掲載 |
| `normal quality` | 普通の品質 | 品質評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：品質タグに掲載 |
| `bad quality` | 悪い品質 | 品質評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：品質タグに掲載 |
| `worst quality` | 最悪の品質 | 品質評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：品質タグに掲載<br>[PixAI Docs – 生成ページガイド（品質タグ）](https://docs.pixai.art/ja/docs/tools/panel-tools)：初期ネガティブプロンプトに含まれる（ネガティブ用途） |
| `masterpiece` | マスターピース | 美的評価 | NovelAI公式の特殊タグ | NAI ×/×/公式/公式・PIXAI 例/—/例 | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：「masterpiece (V4.5 or higher only)」<br>[NovelAI Diffusion V4.5 Full Release（公式ブログ）](https://blog.novelai.net/novelai-diffusion-v4-5-full-release-678318c86205)：「top aesthetic は masterpiece に改称」<br>[NovelAI Docs – 品質タグ追加の切替え](https://docs.novelai.net/en/image/qualitytags/)：V5 Standard・V4.5 の自動品質タグに含まれる<br>[PixAI公式ブログ – プロンプトの書き方](https://blog.pixai.art/ja/how-to-write-pixai-prompts-formula-ja/)：定番セット<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：テンプレートの品質ブロックに使用例 |
| `top aesthetic` | トップエステティック | 美的評価 | NovelAI公式の特殊タグ | NAI ×/公式/—/—・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：「top aesthetic (V4 or higher only)」<br>[NovelAI Diffusion V4.5 Full Release（公式ブログ）](https://blog.novelai.net/novelai-diffusion-v4-5-full-release-678318c86205)：「renamed to the familiar masterpiece tag」 |
| `very aesthetic` | とても美的 | 美的評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/例 | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：美的タグに掲載<br>[NovelAI Docs – 品質タグ追加の切替え](https://docs.novelai.net/en/image/qualitytags/)：V5 Light/Standard・V4.5 Full・V4・Anime V3 の自動品質タグに含まれる<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：テンプレートに使用例 |
| `aesthetic` | 美的 | 美的評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：美的タグに掲載 |
| `displeasing` | 好ましくない | 美的評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：美的タグに掲載 |
| `very displeasing` | とても好ましくない | 美的評価 | NovelAI公式の特殊タグ | NAI 公式/公式/公式/公式・PIXAI —/—/— | [NovelAI Docs – Tagging（品質タグ・美的タグ）](https://docs.novelai.net/en/image/tags/)：美的タグに掲載 |
| `highres` | 高解像度 | 解像感・鮮明さ | 公式資料・テンプレートに同じ文字列の使用例 | NAI —/—/—/—・PIXAI —/—/例 | [PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「masterpiece, best quality, very aesthetic, highres, best illustration」<br>資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `absurdres` | 超高解像度 | 解像感・鮮明さ | NovelAI公式の特殊タグ | NAI 公式/公式/—/—・PIXAI —/—/— | [NovelAI Docs – 品質タグ追加の切替え](https://docs.novelai.net/en/image/qualitytags/)：V4 Full/Curated・Anime V3 の自動品質タグに含まれる<br>資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例（absundres という誤記の例もある） |
| `high definition` | 高精細 | 解像感・鮮明さ | 公開作品などでの使用例（調査資料による。未確認） | NAI —/—/—/—・PIXAI —/—/— | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `8k` | 8K | 解像感・鮮明さ | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | NAI —/—/—/—・PIXAI —/—/例 | [PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「Hyper-detailed anime illustration in 8K」<br>資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `8k resolution` | 8K解像度 | 解像感・鮮明さ | 公式資料・テンプレートに同じ文字列の使用例 | NAI —/—/—/—・PIXAI 例/例/例 | [PixAI Docs – 生成ページガイド（品質タグ）](https://docs.pixai.art/ja/docs/tools/panel-tools)：品質タグの代表例「8k resolution（超高画質）」 |
| `sharp focus` | くっきりした焦点 | 解像感・鮮明さ | 公式資料・テンプレートに同じ文字列の使用例 | NAI —/—/—/—・PIXAI —/—/例 | [PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「sharp focus, anime screencap and game CG style」 |
| `high detail`（仕上げと共有） | 高ディテール | 描き込み密度 | 公式資料・テンプレートに同じ文字列の使用例 | NAI —/—/—/—・PIXAI 例/—/— | [PixAI公式ブログ – プロンプトの書き方](https://blog.pixai.art/ja/how-to-write-pixai-prompts-formula-ja/)：定番セット masterpiece, best quality, high detail<br>資料B：人物ディテール・質感タグ調査レポート（Manus）：全体的な人物ディテールの最優先候補 |
| `highly detailed`（仕上げと共有） | 非常に高密度な描き込み | 描き込み密度 | 調査資料の候補（公式の使用例なし） | NAI —/—/—/—・PIXAI —/—/— | 資料B：人物ディテール・質感タグ調査レポート（Manus）：全体的な人物ディテールの次点候補。high detail と同時投入せず比較するよう注記 |
| `ultra detailed` | 超細密 | 描き込み密度 | 公開作品などでの使用例（調査資料による。未確認） | NAI —/—/—/—・PIXAI —/—/— | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `ultra-detailed` | 超細密（ハイフン表記） | 描き込み密度 | 公開作品などでの使用例（調査資料による。未確認） | NAI —/—/—/—・PIXAI —/—/— | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `intricate details`（仕上げと共有） | 精緻なディテール | 描き込み密度 | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | NAI —/—/—/—・PIXAI —/例/— | [PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：「intricate details in the whales' textured skin, fish scales, hair strands, fabric folds」<br>資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例<br>資料B：人物ディテール・質感タグ調査レポート（Manus）：全体的な人物ディテールの最優先候補 |
| `highly intricate` | 非常に入り組んだ細部 | 描き込み密度 | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | NAI —/—/—/—・PIXAI —/—/例 | [PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「highly intricate elements throughout the entire scene」 |
| `high quality` | 高品質 | 一般的な高品質語 | 公開作品などでの使用例（調査資料による。未確認） | NAI —/—/—/—・PIXAI —/—/— | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `ultra-high quality` | 超高品質 | 一般的な高品質語 | 公開作品などでの使用例（調査資料による。未確認） | NAI —/—/—/—・PIXAI —/—/— | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `best illustration` | 最良のイラスト | 一般的な高品質語 | 公式資料・テンプレートに同じ文字列の使用例 | NAI —/—/—/—・PIXAI —/—/例 | [PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「masterpiece, best quality, very aesthetic, highres, best illustration」 |
| `no text` | 文字なし | 補助（品質評価ではない） | NovelAI公式の特殊タグ | NAI —/公式/公式/公式・PIXAI —/—/— | [NovelAI Diffusion V4.5 Full Release（公式ブログ）](https://blog.novelai.net/novelai-diffusion-v4-5-full-release-678318c86205)：「no text to avoid unwanted texts and logos」<br>[NovelAI Docs – 品質タグ追加の切替え](https://docs.novelai.net/en/image/qualitytags/)：V5 Light/Standard・V4.5・V4 Full の自動品質タグに含まれる |

## 仕上げディテール

| タグ | 日本語名 | 部位 | 種類 | 外見変更リスク（暫定） | 要素追加 | 基本 | 出典区分 | 根拠 |
|---|---|---|---|---|---|---|---|---|
| `detailed eyes` | 詳細な目 | 目・虹彩・まつ毛 | 描き込み | 低：描き込み量の調整が主。強すぎると目の印象が変わることがある。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の最優先候補 |
| `detailed irises` | 詳細な虹彩 | 目・虹彩・まつ毛 | 描き込み | 低：虹彩の内部の描き込みが主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の最優先候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「irises ... rendered with layered gradients and multiple soft highlights」（タグではない） |
| `detailed pupils` | 詳細な瞳孔 | 目・虹彩・まつ毛 | 描き込み | 低：瞳孔まわりの描き込みが主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の最優先候補<br>[PixAI Docs – Other Models（Haruka v2）](https://docs.pixai.art/docs/models/other-models)：Haruka v2 の改善点「refined pupil highlights」（モデルの説明でタグではない） |
| `detailed eyelashes` | 詳細なまつ毛 | 目・虹彩・まつ毛 | 描き込み | 低：まつ毛の描き込みが主。強すぎるとまつ毛が濃く長く見えることがある。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の最優先候補<br>[PixAI Docs – Other Models（Haruka v2）](https://docs.pixai.art/docs/models/other-models)：Haruka v2 の改善点「eyelash layering」（モデルの説明でタグではない） |
| `defined eyelashes` | 輪郭のはっきりしたまつ毛 | 目・虹彩・まつ毛 | 仕上げ | 低：線の明瞭さの調整が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の次点候補 |
| `eye highlights` | 目のハイライト | 目・虹彩・まつ毛 | 仕上げ | 低：反射光の追加が主。強すぎると光点が増えすぎる。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の最優先候補<br>[PixAI Docs – Other Models（Haruka v2）](https://docs.pixai.art/docs/models/other-models)：Haruka v2 の改善点「refined pupil highlights」（タグではない） |
| `glossy eyes` | 光沢のある目 | 目・虹彩・まつ毛 | 質感 | 低：表面のツヤの調整が主。強いと涙目のように見えることがある。 |  |  | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の次点候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「Her black eyes are large and glossy」（タグではない） |
| `gradation eyes` | グラデーションのある瞳 | 目・虹彩・まつ毛 | 質感 | 中：瞳の色の見え方が変わる可能性がある。 |  |  | 公式資料・テンプレートに同じ文字列の使用例 | 資料B：人物ディテール・質感タグ調査レポート（Manus）：目の最優先候補<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「vivid anime coloring, gradation eyes, official art style」 |
| `detailed hair` | 髪の細部描写 | 髪の描き込み・質感 | 描き込み | 低：描き込み量の調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の最優先候補 |
| `intricate hair strands` | 精緻な髪の束・毛筋 | 髪の描き込み・質感 | 描き込み | 低：毛筋の描き込みが主。 |  | ○ | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の最優先候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「intricate details in ... hair strands」（タグではない） |
| `fine hair strands` | 細い髪の毛筋 | 髪の描き込み・質感 | 描き込み | 低：毛筋の描き方の調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の最優先候補 |
| `flyaway hairs` | 浮き毛・後れ毛 | 髪の描き込み・質感 | 仕上げ | 中：新しい浮き毛を追加するため、シルエットが少し変わる可能性がある。 | あり | ○ | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の最優先候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「fine flyaway hairs arc across the face」（タグではない） |
| `soft hair texture` | 柔らかな髪の質感 | 髪の描き込み・質感 | 質感 | 低：質感の調整が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の次点候補 |
| `glossy hair` | つやのある髪 | 髪の描き込み・質感 | 仕上げ | 中：強いと濡れ髪・油っぽさに寄る。shiny hair は光が拡散しやすいため収録していない。 |  |  | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の次点候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「glossy hair strands」（タグではない） |
| `hair sheen` | 髪の光沢感 | 髪の描き込み・質感 | 仕上げ | 中：光沢の帯が増えると髪色の見え方が変わる可能性がある。 |  | ○ | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：髪の最優先候補<br>[PixAI Docs – Other Models（Haruka v2）](https://docs.pixai.art/docs/models/other-models)：Haruka v2 の改善点「better hair sheen transitions」（モデルの説明でタグではない） |
| `smooth skin` | なめらかな肌 | 肌の質感 | 仕上げ | 低：表面の滑らかさの調整が主。 |  | ○ | 公式資料・テンプレートに同じ文字列の使用例 | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の最優先候補<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「delicate facial features, smooth skin, masterpiece」 |
| `soft skin` | 柔らかな肌 | 肌の質感 | 仕上げ | 低：陰影の柔らかさの調整が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の次点候補 |
| `detailed skin` | 描き込まれた肌 | 肌の質感 | 描き込み | 中：写実化や肌の凹凸が強調される可能性がある。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の次点候補 |
| `skin texture` | 肌のテクスチャ | 肌の質感 | 描き込み | 中：写実化・ざらつきに寄る可能性がある。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の最優先候補 |
| `dewy skin` | みずみずしい肌 | 肌の質感 | 仕上げ | 中：汗・濡れ・プラスチックのような質感に寄る可能性がある。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の最優先候補 |
| `luminous skin` | ほのかに光る肌 | 肌の質感 | 仕上げ | 中：肌の明るさが変わり、発光表現に寄る可能性がある。 |  |  | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の次点候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「luminous skin reflections」（タグではない） |
| `shiny skin` | 光沢のある肌 | 肌の質感 | 仕上げ | 中：汗・濡れ・プラスチックのような質感に寄る可能性がある。 |  |  | 公式資料・テンプレートに同じ文字列の使用例 | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の最優先候補<br>[PixAI Docs – Tsubaki.3 Prompt Templates](https://docs.pixai.art/docs/models/tsubaki3-prompts)：「(chromatic aberration, film_grain, bloom, overexposure, 3D, shiny skin :1.3)」 |
| `skin sheen` | 肌の薄いツヤ | 肌の質感 | 質感 | 低：薄いツヤの調整が主。強くすると濡れ感に寄る。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：肌の最優先候補 |
| `glossy lips` | 艶やかな唇 | 唇・口元 | 仕上げ | 低：表面の光沢の調整が主。強いと化粧をした印象になる。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の最優先候補 |
| `shiny lips` | 光沢のある唇 | 唇・口元 | 仕上げ | 低：反射光の追加が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の候補 |
| `soft lips` | 柔らかな質感の唇 | 唇・口元 | 質感 | 低：質感の調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の最優先候補 |
| `subtle lip texture` | 控えめな唇の質感 | 唇・口元 | 描き込み | 低：描き込みの調整が主。強いと荒れた唇に見える。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の最優先候補 |
| `hydrated lips` | うるおいのある唇 | 唇・口元 | 質感 | 低：質感の調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の最優先候補 |
| `natural lip sheen` | 自然な唇のツヤ | 唇・口元 | 仕上げ | 低：薄いツヤの調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の最優先候補 |
| `smooth lips` | 滑らかな唇 | 唇・口元 | 質感 | 低：質感の調整が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の次点候補 |
| `subtle lip highlight` | 控えめな唇ハイライト | 唇・口元 | 仕上げ | 低：反射光の追加が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：唇の次点候補 |
| `detailed fabric` | 細部まで描かれた布地 | 衣服・装飾・素材 | 描き込み | 低：既存の布の描き込みが主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の最優先候補 |
| `fabric texture` | 布地の質感 | 衣服・装飾・素材 | 質感 | 低：質感の調整が主。 |  | ○ | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の最優先候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「subtle fabric textures」（タグではない） |
| `detailed clothing` | 衣服の細密描写 | 衣服・装飾・素材 | 描き込み | 中：装飾が増えたように見え、衣服の印象が変わる可能性がある。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の次点候補 |
| `intricate embroidery` | 精緻な刺繍 | 衣服・装飾・素材 | 描き込み | 中：刺繍という新しい装飾を足す可能性がある。図柄や色の指定はしない。 | あり | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の最優先候補 |
| `lace detail` | レースの細部 | 衣服・装飾・素材 | 描き込み | 中：レースという新しい装飾を足す可能性がある。 | あり |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の次点候補 |
| `metallic texture` | 金属の質感 | 衣服・装飾・素材 | 質感 | 中：金属でない部分まで金属的に見える可能性がある。 |  |  | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の次点候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「glossy metallic finish」（タグではない） |
| `water droplets` | 水滴 | 衣服・装飾・素材 | 仕上げ | 中：水滴を新しく足し、濡れた状況に見える可能性がある。 | あり |  | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：衣服の次点候補<br>[PixAI – Tsubaki.2 Guide](https://pixai.art/en/tsubaki-2/guide)：作例文「Tiny water droplets / dewdrops cling to hair strands」（タグではない） |
| `detailed clothes` | 衣服の描き込み | 衣服・装飾・素材 | 描き込み | 中：装飾が増えたように見える可能性がある。 |  |  | 公開作品などでの使用例（調査資料による。未確認） | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `fine details` | 細部のディテール | 全体の細密さ | 描き込み | 低：描き込み量の調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：全体の最優先候補 |
| `detailed textures` | 細密な質感 | 全体の細密さ | 質感 | 低：質感の調整が主。 |  | ○ | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：全体の最優先候補 |
| `refined details` | 洗練された細部 | 全体の細密さ | 仕上げ | 低：仕上げの調整が主。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：全体の次点候補 |
| `polished rendering` | 磨き込まれたレンダリング | 全体の細密さ | 仕上げ | 低：仕上げの調整が主。画風が動く可能性がある。 |  |  | 調査資料の候補（公式の使用例なし） | 資料B：人物ディテール・質感タグ調査レポート（Manus）：全体の次点候補 |
| `detailed background` | 描き込まれた背景 | 全体の細密さ | 描き込み | 中：背景という新しい要素を足し、構図の印象が変わる可能性がある。 | あり |  | 公開作品などでの使用例（調査資料による。未確認） | 資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）：PixAI公開作品での使用例 |
| `high detail`（品質と共有・同じID） | 高ディテール | 全体の細密さ | 描き込み | — |  |  | 公式資料・テンプレートに同じ文字列の使用例 | 品質調合の行を参照 |
| `highly detailed`（品質と共有・同じID） | 非常に高密度な描き込み | 全体の細密さ | 描き込み | — |  |  | 調査資料の候補（公式の使用例なし） | 品質調合の行を参照 |
| `intricate details`（品質と共有・同じID） | 精緻なディテール | 全体の細密さ | 描き込み | — |  |  | 公式の作例文の中に同じ語句（タグとしての掲載ではない） | 品質調合の行を参照 |

## NovelAI の自動品質タグ（2026-10-24 照合）

V3〜V5 は、NovelAI側がプロンプトの末尾に追加する（Anime V2 以前は先頭）。入力欄には見えないがプロンプトの文字数上限には含まれる。

| モデル | 設定 | 追加されるタグ |
|---|---|---|
| nai_v5 | light | very aesthetic, amazing quality, no text |
| nai_v5 | standard | very aesthetic, masterpiece, no text |
| nai_v45 | on | location, very aesthetic, masterpiece, no text |
| nai_v45 | onCurated | location, masterpiece, no text, -0.8::feet::, rating:general |
| nai_v4 | on | no text, best quality, very aesthetic, absurdres |
| nai_v4 | onCurated | rating:general, amazing quality, very aesthetic, absurdres |
| nai_v3 | on | best quality, amazing quality, very aesthetic, absurdres |

出典：[https://docs.novelai.net/en/image/qualitytags/](https://docs.novelai.net/en/image/qualitytags/)

## 依頼書・資料Bの候補の採否

- 依頼書の品質候補 25 件：すべて収録
- 資料Bの仕上げ候補 45 件：すべて収録

### 追加したもの

- `sharp focus`（QLT-RES-006）：PixAI Tsubaki.3 の公式テンプレートに使用例
- `highly intricate`（QLT-DEN-006）：PixAI Tsubaki.3 の公式テンプレートに使用例
- `best illustration`（QLT-GEN-003）：PixAI Tsubaki.3 の公式テンプレートの品質ブロックに使用例
- `detailed clothes`（DTL-CLO-008）：資料A：PixAI公開作品での使用例
- `detailed background`（DTL-ALL-005）：資料A：PixAI公開作品での使用例

### 収録しなかったもの

| 候補 | 層 | 理由 |
|---|---|---|
| big eyes | 仕上げ | 目の大きさ・顔立ちを変える外見設定のため（資料Bも見送り）。 |
| shiny hair | 仕上げ | 髪全体の光沢や濡れ髪へ拡散しやすい（資料Bの見送り候補）。代わりに hair sheen / glossy hair を収録。 |
| airy, semi-transparent hair strands | 仕上げ | 髪全体の透明化や光学効果に逸れやすい（資料Bの見送り候補）。 |
| matte skin | 仕上げ | 反射を抑えすぎて平坦化し、差分として不安定（資料Bの見送り候補）。 |
| subtle pores | 仕上げ | アニメ表現で写実化・点状ノイズに寄りやすく、根拠も弱い（資料Bの見送り候補）。 |
| plump lips | 仕上げ | 唇の厚み・形を変える外見設定のため。 |
| polished metal | 仕上げ | 反射が強く、金属以外に波及しやすい（資料Bの見送り候補）。代わりに metallic texture を収録。 |
| glass-like | 仕上げ | 透明化・背景効果に逸れやすい（資料Bの見送り候補）。 |
| high complexity | 仕上げ | NovelAI V5 の画面全体の複雑度タグ。既存の「複雑度」設定で扱う。 |
| highly detailed face | 仕上げ | 顔立ち・表情・目の印象を変えやすい（資料Bの見送り候補）。 |
| pale skin / tan skin | 仕上げ | 肌の色の指定（人物設定）のため。 |
| 髪型・髪色の指定 | 仕上げ | 人物の外見設定のため。人物設定側のツールで扱う。 |
| lowres, low quality, bad anatomy, bad hands, text, error, missing fingers, jpeg artifacts, signature, watermark | 品質 | PixAIの初期ネガティブプロンプトに含まれる語。ネガティブプロンプト生成は今回の対象外で、人物の破綻に関するタグは品質調合の中心に含めない。 |
| beautiful anime aesthetic | 品質 | 画風の方向まで含む抽象的な語で、品質評価・描き込み密度のどちらにも当てはまらず、根拠も公開作品の使用例のみ。 |
| location / rating:general / -0.8::feet:: | 品質 | NovelAI V4.5・V4 の自動品質タグに含まれるが、場所・レーティング・部位の指定で、品質評価ではないため。 |
| absundres | 品質 | absurdres の誤記（資料A）。absurdres の別名として検索できるようにした。 |
