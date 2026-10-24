# NovelAI公式タグ照合一覧（v1.1）

照合日：2026-10-24

公式資料に掲載されていることと、画像生成で期待どおりの効果が確認されたことは別の情報。このファイルは前者のみを扱う。

| 区分 | 件数 |
|---|---:|
| 完全一致（既存） | 26 |
| 追加 | 69 |
| 専用UI | 6 |
| 収録しない | 27 |
| 重複掲載 | 1 |
| 合計 | 129 |

- 辞書の総件数：398（元の再構築版 329 ＋ 公式追加 69）
- 「完全一致」は英語の文字列が一致するもの（大小文字は区別しない）。「追加」の「似た既存タグ」は意味が近い別表現で、統合していない。

資料：
- [NovelAI Docs – Prompting for Unique Artstyles](https://docs.novelai.net/en/image/tutorial-artstyles/)
- [NovelAI Docs – Unique Artstyles（日本語版）](https://docs.novelai.net/ja/image/tutorial-artstyles/)
- [NovelAI Docs – Tagging](https://docs.novelai.net/en/image/tags/)
- [NovelAI Docs – Strengthening & Weakening](https://docs.novelai.net/en/image/strengthening-weakening/)

## Unique Artstyles

| 公式タグ | 節 | 結果 | 辞書のID・カテゴリ | 似た既存タグ／理由 |
|---|---|---|---|---|
| `traditional media` | Medium | 追加 | NAI-TEX-001（画材・質感） | traditional media texture |
| `faux traditional media` | Medium | 追加 | NAI-TEX-002（画材・質感） | traditional media texture |
| `mixed media` | Medium | 追加 | NAI-TEX-003（画材・質感） | — |
| `unconventional media` | Medium | 追加 | NAI-TEX-004（画材・質感） | — |
| `acrylic paint (medium)` | Medium | 追加 | NAI-TEX-005（画材・質感） | acrylic painting, acrylic paint texture |
| `ballpoint pen (medium)` | Medium | 追加 | NAI-TEX-006（画材・質感） | — |
| `calligraphy brush (medium)` | Medium | 追加 | NAI-TEX-007（画材・質感） | calligraphic lines, brush pen linework |
| `colored pencil (medium)` | Medium | 追加 | NAI-TEX-008（画材・質感） | colored pencil rendering |
| `graphite (medium)` | Medium | 追加 | NAI-TEX-009（画材・質感） | graphite texture, pencil outlines |
| `ink (medium)` | Medium | 追加 | NAI-TEX-010（画材・質感） | ink drawing, ink texture |
| `marker (medium)` | Medium | 追加 | NAI-TEX-011（画材・質感） | marker coloring, marker strokes |
| `millipen (medium)` | Medium | 追加 | NAI-TEX-012（画材・質感） | fineliner linework |
| `nib pen (medium)` | Medium | 追加 | NAI-TEX-013（画材・質感） | — |
| `oil painting (medium)` | Medium | 追加 | NAI-TEX-014（画材・質感） | oil painting, oil paint texture |
| `painting (medium)` | Medium | 追加 | NAI-TEX-015（画材・質感） | — |
| `pastel (medium)` | Medium | 追加 | NAI-TEX-016（画材・質感） | pastel painting, pastel texture |
| `pen (medium)` | Medium | 追加 | NAI-TEX-017（画材・質感） | — |
| `watercolor (medium)` | Medium | 追加 | NAI-TEX-018（画材・質感） | watercolor wash, watercolor blooms |
| `watercolor pencil (medium)` | Medium | 追加 | NAI-TEX-019（画材・質感） | — |
| `3d` | Medium | 追加 | NAI-STY-001（基本画風） | 3D rendering |
| `blender (medium)` | Medium | 追加 | NAI-STY-002（基本画風） | 3D rendering |
| `ai-generated` | Medium | 収録しない | — | 制作手段（AIによる生成）を示すメタ情報で、描画表現を指定するタグではないため。 |
| `ai-assisted` | Medium | 収録しない | — | 制作手段（AIによる支援）を示すメタ情報で、描画表現を指定するタグではないため。 |
| `anime screencap` | Medium | 追加 | NAI-STY-003（基本画風） | anime illustration |
| `pixel art` | Medium | 完全一致（既存） | REC-STY-014（基本画風） | — |
| `dithering` | Medium | 追加 | NAI-ATM-004（大気感・印刷表現） | dot shading |
| `abstract` | Art style | 追加 | NAI-STY-004（基本画風） | abstract painting |
| `surreal` | Art style | 追加 | NAI-STY-005（基本画風） | surrealism |
| `art nouveau` | Art style | 完全一致（既存） | REC-STY-021（基本画風） | — |
| `impressionism` | Art style | 完全一致（既存） | REC-STY-023（基本画風） | — |
| `ligne claire` | Art style | 完全一致（既存） | REC-STY-036（基本画風） | — |
| `nihonga` | Art style | 完全一致（既存） | REC-STY-038（基本画風） | — |
| `ukiyo-e` | Art style | 完全一致（既存） | REC-STY-037（基本画風） | — |
| `realistic` | Art style | 追加 | NAI-STY-006（基本画風） | realistic rendering, photorealistic |
| `photorealistic` | Art style | 完全一致（既存） | REC-STY-005（基本画風） | — |
| `retro artstyle` | Art style | 追加 | NAI-STY-007（基本画風） | retro anime style |
| `painterly` | Art style | 追加 | NAI-STY-008（基本画風） | painterly illustration, painterly shading |
| `sketch` | Art style | 追加 | NAI-LIN-001（描線・線画） | sketchy lines |
| `lineart` | Art style | 完全一致（既存） | REC-LIN-001（描線・線画） | — |
| `no lineart` | Art style | 完全一致（既存） | REC-LIN-025（描線・線画） | — |
| `jaggy lines` | Art style | 追加 | NAI-LIN-002（描線・線画） | — |
| `outline` | Art style | 追加 | NAI-LIN-003（描線・線画） | bold outlines, strong contour lines |
| `vector trace` | Art style | 追加 | NAI-LIN-004（描線・線画） | vector art |
| `color trace` | Art style | 追加 | NAI-LIN-005（描線・線画） | colored outlines |
| `production art` | Art style | 追加 | NAI-STY-011（基本画風） | — |
| `animation paper` | Art style | 追加 | NAI-TEX-021（画材・質感） | — |
| `game cg` | Art style | 追加 | NAI-STY-009（基本画風） | visual novel style |
| `official art` | Art style | 追加 | NAI-STY-010（基本画風） | — |
| `shikishi` | Art style | 追加 | NAI-TEX-020（画材・質感） | — |
| `oekaki` | Art style | 追加 | NAI-LIN-006（描線・線画） | — |
| `tegaki` | Art style | 追加 | NAI-LIN-007（描線・線画） | — |
| `year XXXX` | Art style | 専用UI | — | 年タグ専用の設定欄で扱う（year 2024 形式）。 |
| `anime coloring` | Coloring | 完全一致（既存） | REC-COL-002（塗り・彩色） | — |
| `colorful` | Coloring | 追加 | NAI-PAL-001（色彩・パレット） | vibrant colors |
| `dark` | Coloring | 追加 | NAI-PAL-002（色彩・パレット） | dark palette |
| `limited palette` | Coloring | 完全一致（既存） | REC-PAL-007（色彩・パレット） | — |
| `partially colored` | Coloring | 追加 | NAI-PAL-003（色彩・パレット） | — |
| `spot color` | Coloring | 追加 | NAI-PAL-004（色彩・パレット） | grayscale with accent color |
| `monochrome` | Coloring | 完全一致（既存） | REC-PAL-005（色彩・パレット） | — |
| `greyscale` | Coloring | 完全一致（既存） | REC-PAL-006（色彩・パレット） | — |
| `muted color` | Coloring | 追加 | NAI-PAL-005（色彩・パレット） | muted colors |
| `pale color` | Coloring | 追加 | NAI-PAL-006（色彩・パレット） | pale palette, pastel colors |
| `pastel colors` | Coloring | 完全一致（既存） | REC-PAL-004（色彩・パレット） | — |
| `flat color` | Coloring | 完全一致（既存） | REC-COL-005（塗り・彩色） | — |
| `high contrast` | Coloring | 完全一致（既存） | REC-SHA-009（陰影・コントラスト） | — |
| `sepia` | Coloring | 追加 | NAI-PAL-007（色彩・パレット） | sepia tone |
| `aqua theme` | Coloring | 追加 | NAI-PAL-101（色彩・パレット） | — |
| `black theme` | Coloring | 追加 | NAI-PAL-102（色彩・パレット） | — |
| `blue theme` | Coloring | 追加 | NAI-PAL-103（色彩・パレット） | — |
| `brown theme` | Coloring | 追加 | NAI-PAL-104（色彩・パレット） | — |
| `green theme` | Coloring | 追加 | NAI-PAL-105（色彩・パレット） | — |
| `grey theme` | Coloring | 追加 | NAI-PAL-106（色彩・パレット） | — |
| `orange theme` | Coloring | 追加 | NAI-PAL-107（色彩・パレット） | — |
| `pink theme` | Coloring | 追加 | NAI-PAL-108（色彩・パレット） | — |
| `purple theme` | Coloring | 追加 | NAI-PAL-109（色彩・パレット） | — |
| `red theme` | Coloring | 追加 | NAI-PAL-110（色彩・パレット） | — |
| `white theme` | Coloring | 追加 | NAI-PAL-111（色彩・パレット） | — |
| `yellow theme` | Coloring | 追加 | NAI-PAL-112（色彩・パレット） | — |
| `backlighting` | Special effects | 完全一致（既存） | REC-LIT-001（光・ライティング） | — |
| `bloom` | Special effects | 完全一致（既存） | REC-OPT-001（光学効果） | — |
| `bokeh` | Special effects | 完全一致（既存） | REC-OPT-002（光学効果） | — |
| `chromatic aberration` | Special effects | 完全一致（既存） | REC-OPT-004（光学効果） | — |
| `depth of field` | Special effects | 完全一致（既存） | REC-OPT-006（光学効果） | — |
| `diffraction spikes` | Special effects | 完全一致（既存） | REC-OPT-022（光学効果） | — |
| `dithering` | Special effects | 重複掲載 | — | 同じページの別の節にも掲載。照合は最初の節で実施。 |
| `drop shadow` | Special effects | 追加 | NAI-SHA-001（陰影・コントラスト） | cast shadows |
| `emphasis lines` | Special effects | 追加 | NAI-ATM-001（大気感・印刷表現） | — |
| `speed lines` | Special effects | 追加 | NAI-ATM-002（大気感・印刷表現） | — |
| `motion lines` | Special effects | 追加 | NAI-ATM-003（大気感・印刷表現） | motion blur |
| `glitch` | Special effects | 追加 | NAI-OPT-001（光学効果） | chromatic aberration |
| `halftone` | Special effects | 完全一致（既存） | REC-ATM-009（大気感・印刷表現） | — |
| `lens flare` | Special effects | 完全一致（既存） | REC-OPT-003（光学効果） | — |
| `motion blur` | Special effects | 完全一致（既存） | REC-OPT-014（光学効果） | — |
| `soft focus` | Special effects | 完全一致（既存） | REC-OPT-009（光学効果） | — |
| `very aesthetic` | (introduction) | 収録しない | — | 美的評価タグ。今回は品質・美的タグを主な収集対象にしない方針。公式は画風タグと併用する際に [] で弱めることを勧めている。 |
| `aesthetic` | (introduction) | 収録しない | — | 同上（美的評価タグ）。 |

## Tagging

| 公式タグ | 節 | 結果 | 辞書のID・カテゴリ | 似た既存タグ／理由 |
|---|---|---|---|---|
| `best quality` | Quality Tags | 収録しない | — | 品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。 |
| `amazing quality` | Quality Tags | 収録しない | — | 品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。 |
| `great quality` | Quality Tags | 収録しない | — | 品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。 |
| `normal quality` | Quality Tags | 収録しない | — | 品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。 |
| `bad quality` | Quality Tags | 収録しない | — | 品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。 |
| `worst quality` | Quality Tags | 収録しない | — | 品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。 |
| `masterpiece` | Aesthetic Tags | 収録しない | — | 美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。 |
| `top aesthetic` | Aesthetic Tags | 収録しない | — | 美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。 |
| `very aesthetic` | Aesthetic Tags | 収録しない | — | 美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。 |
| `aesthetic` | Aesthetic Tags | 収録しない | — | 美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。 |
| `displeasing` | Aesthetic Tags | 収録しない | — | 美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。 |
| `very displeasing` | Aesthetic Tags | 収録しない | — | 美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。 |
| `low complexity` | Complexity Tags | 専用UI | — | 複雑度の専用設定（排他選択）で扱う。V5専用と公式に記載。 |
| `medium complexity` | Complexity Tags | 専用UI | — | 複雑度の専用設定（排他選択）で扱う。V5専用と公式に記載。 |
| `high complexity` | Complexity Tags | 専用UI | — | 複雑度の専用設定（排他選択）で扱う。V5専用と公式に記載。 |
| `ultra complexity` | Complexity Tags | 専用UI | — | 複雑度の専用設定（排他選択）で扱う。V5専用と公式に記載。 |
| `year XXXX` | Year Tags | 専用UI | — | 年タグ専用の設定欄で扱う。 |
| `fur dataset` | Dataset Tags | 収録しない | — | 学習データの区分を切り替えるタグで、題材（獣人・背景）が主体になるため。 |
| `background dataset` | Dataset Tags | 収録しない | — | 学習データの区分を切り替えるタグで、題材（獣人・背景）が主体になるため。 |
| `transparent background` | Alpha Transparency Tags | 収録しない | — | 背景の透過という出力形式の指定で、画風ではないため。V5専用と公式に記載。 |
| `has alpha` | Alpha Transparency Tags | 収録しない | — | 背景の透過という出力形式の指定で、画風ではないため。V5専用と公式に記載。 |
| `alpha transparency` | Alpha Transparency Tags | 収録しない | — | 背景の透過という出力形式の指定で、画風ではないため。V5専用と公式に記載。 |
| `location` | Other Tags | 収録しない | — | 場所（屋内・屋外）の指定で、画風ではないため。 |
| `attractive male` | Other Tags | 収録しない | — | 人物の容姿の指定で、アプリの方針（人物を指定しない）に反するため。V5専用。 |
| `visual novel bg` | Other Tags | 収録しない | — | 人物のいない背景画像という題材・構図の指定が主体のため。V5専用。 |
| `visual novel sprite` | Other Tags | 収録しない | — | 立ち絵という構図・人物配置の指定が主体のため。V5専用。 |
| `visual novel chibi` | Other Tags | 収録しない | — | ちびキャラという人物の頭身の指定が主体のため。V5専用。 |
| `depthness` | Other Tags | 追加（V5専用） | NAI-SHA-101（陰影・コントラスト） | deep shadows |
| `meta:novel era` | Other Tags | 追加（V5専用） | NAI-STY-101（基本画風） | — |
| `meta:golden era` | Other Tags | 追加（V5専用） | NAI-STY-102（基本画風） | — |
| `visual novel art` | Other Tags | 追加（V5専用） | NAI-STY-103（基本画風） | visual novel style |
| `visual novel cg` | Other Tags | 追加（V5専用） | NAI-STY-104（基本画風） | visual novel style |

## Strengthening & Weakening

| 公式タグ | 節 | 結果 | 辞書のID・カテゴリ | 似た既存タグ／理由 |
|---|---|---|---|---|
| `simple illustration` | Negative Numerical Emphasis | 収録しない | — | 強調構文の説明用の例（負の強調）として出てくるだけで、画風タグとしての説明がないため。このアプリは負の強調を出力しない。 |

