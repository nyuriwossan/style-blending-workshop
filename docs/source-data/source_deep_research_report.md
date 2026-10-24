# 画風調合工房｜PIXAI・NovelAI対応の画風プロンプト辞書・Webアプリ事前調査

## 調査結論

結論から言う。**この構想は十分に実装可能だ。しかも、サーバーなし・アカウントなし・GitHub Pages公開という条件でも、主要機能のほぼ全部をMVPに載せられる。** GitHub PagesはHTML/CSS/JavaScriptを静的配信できるため、タグ辞書、プロンプト変換、競合判定、レシピ保存、JSON入出力、コピーといった処理はブラウザだけで完結できる。 citeturn21view4turn24view0turn24view1turn24view2turn24view3

ただし、設計の中心を「タグ文字列」に置くのはまずい。俺なら、アプリ全体を次の三層に分離する。

| 層 | 役割 | 例 |
|---|---|---|
| Semantic Concept | モデル非依存の「意味」 | rim lighting、watercolor、muted color |
| Model Mapping | モデルごとの表記・対応度 | NAI公式tag、Tsubaki自然文、SDXL短句 |
| Renderer | 強度・順序・構文への変換 | `(x:1.2)`、`1.2::x ::`、自然言語強調 |

この構造なら、**画風辞書のかなりの部分をPIXAIとNovelAIで共通化しつつ、構文と対応表現だけをモデル別に分離できる。** NovelAIには公式チュートリアルで画材・画風・彩色・特殊効果の具体的なタグ群が列挙されている一方、PixAIのTsubaki系は長めの記述的プロンプトを積極的に扱うため、「意味は共通、文字列と変換規則は別」が一番壊れにくい。 citeturn22view0turn22view1turn22view2turn23view0turn25view3

今回、**非アーティスト系の候補を329件**収録した。そのうち、公式資料にexact tagまたは公式別名として根拠を置けるものを99件、公式プロンプト例で確認できる表現を32件、一般的な美術・撮影用語として意味は明確だが個別モデル効果を未実測のものを38件、実験候補として残すものを160件に分離した。これは「英語として自然だから有効なタグのはず」という雑な水増しを避けるための区別だ。

初期画面に329件全部を出すのは悪手だ。そこで、研究上のS/A候補169件とは別に、**MVP Coreを72件**へ絞った。残りは検索・詳細表示から呼び出す設計としている。

最終的な十の問いへの回答を先にまとめると、こうなる。

| 問い | 結論 |
|---|---|
| 最適なカテゴリ | 基本画風、線画、塗り、照明、陰影、色彩、画材・質感、光学効果、大気・印刷の9分類 |
| PIXAIとNAIの辞書共通化 | **意味IDはかなり共通化可能。出力文字列まで完全共通化は不可** |
| 分けるべきもの | 構文は必ず分離。タグ表現・対応度も部分的に分離 |
| スライダー | SDXLとNAI V4+は数値変換しやすい。Tsubakiは自然言語段階を既定にすべき |
| 数値weight不可時 | subtle / gentle / strong等による自然言語化。ただし数値との等価換算を主張しない |
| 相反タグ | 明確な矛盾だけ制限、それ以外は警告・スコープ分離を提案 |
| 顔への影響抑制 | キャラクター情報とstyle blockを分離し、造形言語を変えるタグを弱く扱う |
| 最初に実装 | 72 Core、モデル別renderer、競合チェック、36 preset、保存・JSON入出力 |
| 難しい部分 | Tsubaki強度の数値化、モデル間で同じ「1.2」を同じ見た目にすること、顔の完全固定 |
| 静的Webで可能な範囲 | API生成以外はほぼ全部。辞書・変換・保存・検索・競合・presetはクライアントのみで可能 |

## モデル別のプロンプト仕様と強度制御

**PIXAIについては、Tsubaki.3、Tsubaki.2、SDXL系を同一rendererにしてはいけない。** ここは今回の調査でかなりはっきりした。

Tsubaki.3は2026年10月24日時点のPixAI公式ドキュメントで「Latest Flagship」とされており、光の方向・強度・色温度、逆光、god rays、水越しの光、film grain、lens flare、shallow depth of field、white balanceなどを直接指定できると説明されている。また、photorealismからanimeまでのスタイル遷移もpromptで直接扱えるとされている。 citeturn23view4turn25view3

さらにTsubaki.3 Technical Reportは2026年8月版で、評価項目としてcharacter identityとstyle treatmentを区別し、character/style fidelityの評価には固定prompt bankとmatched seedsを用いている。つまり、今回考えている「同一seed・同一基本promptでstyleだけを変える」という検証方法は、少なくとも考え方としてPixAI自身の評価方法とも整合する。 citeturn21view0turn22view7

一方、Tsubaki.2はPixAI公式モデル比較でnatural-language prompting、Haruka v2はtag-based promptingと明確に分けられている。Haruka v2はPixAIのclassic anime SDXLモデルで、SDXL LoRA互換も公式に案内されている。Tsubaki.2はLite / Standard / Pro / Ultimateの四モードを持ち、custom negative promptはProとUltimateに限られる。今回の依頼条件どおり、画風調合工房では**Tsubaki系にnegative promptを自動生成しない**設計で問題ない。 citeturn23view0turn23view1

強度スライダーについては、次の方式を推奨する。

| モデル | 0 | 1.0 | 1未満 | 1超 | 推奨方式 |
|---|---|---|---|---|---|
| PIXAI SDXL | 削除 | plain tag | `(tag:w)` | `(tag:w)` | 数値weight |
| Tsubaki.2 | 削除 | plain phrase | 自然言語で弱化 | 自然言語で強化 | **自然言語を既定** |
| Tsubaki.3 | 削除 | plain phrase | 自然言語で弱化 | 自然言語で強化 | **自然言語を既定** |
| NAI V5 | 削除 | plain | `w::tag ::` | `w::tag ::` | 数値weight |
| NAI V4.5 | 削除 | plain | `w::tag ::` | `w::tag ::` | 数値weight |
| NAI V4 | 削除 | plain | `w::tag ::` | `w::tag ::` | 数値weight |
| NAI V3 | 削除 | plain | `[]` | `{}` | 1.05倍ベクトル近似 |

PixAI公式SDXLガイドは `(keyword:weight)` 形式を案内しており、1.5を超えるweightは画像を過剰に崩す恐れがあるため避けるよう説明している。したがって共通UIを0〜1.6にしても、**SDXL rendererは既定で1.5にclampして警告**する設計が安全だ。 citeturn21search0

Tsubakiは少し厄介だ。Tsubaki.3の公式Prompt Templatesには実際に `(chromatic aberration, film_grain, bloom, overexposure, 3D, shiny skin :1.3)` という数値付き例がある。またTsubaki.2の公式ガイドにも`:1.3`を含む例が確認できる。従って「数値weightが一切使えない」と断定するのも誤りだ。 citeturn25view4turn14view0

しかし、**今回確認した現行公式資料の範囲では、Tsubaki.2/3の数値weightについて、正式なparser仕様、保証された範囲、1.2が何％の強調に相当するか、短いtagと長い自然文で同じ意味になるか、といった仕様は見つからなかった。** したがって俺なら、Tsubakiでは数値weightを「実験モード」に留め、通常モードでは正規化sliderを以下のような自然言語段階に落とす。

`0 → omit`、`0.01–0.64 → subtle/restrained`、`0.65–0.89 → gentle/slight`、`0.90–1.10 → plain`、`1.11–1.34 → strong/pronounced`、`1.35–1.60 → intense/dominant`。

これは**アプリ側のUX設計案であって、PixAI公式の数値換算ではない**。ここはUIにも明記すべきだ。

NovelAIはかなり明快だ。公式仕様では`{ }`が1段につきfocusを1.05倍、`[ ]`が1/1.05倍と定義され、V4以上では`1.5::rain ::`のようなnumerical emphasisが利用できる。0〜1は弱化に利用でき、negative numeric emphasisはV4.5以上だけに対応する。今回の0〜1.6正値sliderなら、negative emphasisはそもそも不要だ。 citeturn21view1

したがってNAI V3のみ、

`n = round(abs(log(w) / log(1.05)))`

でslider値からbrace/bracket数へ近似できる。ただしこれは**数学上のfocus倍率を合わせるだけ**で、1.2が画像上で「20%強く見える」という意味ではない。生成モデルの視覚効果はそこまで行儀よく線形ではない。

NovelAIのモデル体系も分離した。公式ドキュメントではV5 FullとV5 Curatedがlatestで、V5 Fullは約1471 effective tokens、Curatedは約703 tokens。V5は日本語を含む多言語promptに対応する。V4.5とV4はprevious modelsとして提供され、それぞれ約512 T5 tokensで、V4/V4.5では日本語を含む多くのUnicode文字をpromptに使えないと明記されている。Anime V3もprevious modelとしてページ上に残り、先頭に近いtagほど強く扱う独自のordering behaviorがある。 citeturn25view0turn25view1turn25view2

なお、NovelAIのモデルページ冒頭には「6 different models」とある一方、その後にAnime V3やFurry V3もretiredより前に記載されている。このため本成果物では、V5/V4.5/V4を主要profile、Anime V3を**legacy-compatible profile**として扱った。公式ページ自身の表示体系に少し曖昧さがあるので、ここを勝手に一本化しなかった。 citeturn22view3turn25view2

## 画風辞書、分類体系、競合と顔への影響

今回の辞書は九カテゴリにした。この分け方が実用上かなり重要だ。

| Category | 件数 | 役割 |
|---|---:|---|
| style_genre | 43 | アニメ、漫画、セミリアル、版画、3D等 |
| linework | 43 | 太さ、線質、線色、ハッチング、線の有無 |
| coloring_shading | 40 | セル、フラット、厚塗り、水彩等 |
| lighting | 44 | 光源位置、硬さ、色温度、光源数、大気光 |
| shadow_contrast | 23 | 影、明暗幅、コントラスト |
| color_palette | 41 | 彩度、色数、色温度、配色構成 |
| medium_texture | 43 | 紙、キャンバス、画材、筆触、粒子 |
| optical_effects | 28 | bloom、bokeh、film grain、DOF等 |
| atmosphere_print | 24 | 空気感、スクリーントーン、印刷・版画効果 |
| **合計** | **329** |  |

特に「塗り」と「画材」、「照明」と「陰影」、「照明」と「光学・後処理」を分けた。たとえば`watercolor`と`paper texture`、`backlighting`と`deep shadows`、`glow`と`bloom`を別sliderにできる。これは調合ツールとしてかなり効く。

NovelAI公式のUnique Artstyles tutorialには、`traditional media`、`watercolor (medium)`、`oil painting (medium)`、`pixel art`、`art nouveau`、`impressionism`、`ligne claire`、`nihonga`、`ukiyo-e`、`realistic`、`photorealistic`、`painterly`、`lineart`、`no lineart`、`anime coloring`、`limited palette`、`monochrome`、`muted color`、`pastel colors`、`flat color`、`backlighting`、`bloom`、`bokeh`、`chromatic aberration`、`depth of field`、`halftone`、`lens flare`、`soft focus`などが公式例として明示されている。 citeturn22view1turn22view2

ここは辞書の強い土台になる。ただしNovelAI公式tagだからといってPIXAIでも「同じ学習済みtag」とみなすのは駄目だ。本データではNovelAI側を`official_exact_tag`、Tsubaki側は公式例に存在する場合のみ`official_example`、それ以外は`natural_language_candidate_effect_unverified`などと区別した。

Tsubaki.3についても、公式Prompt Templatesにはflat coloring、clean lineart、cel shading、manga linework、3D-render look、ukiyo-e、pixel art、chiaroscuroなど多数の実例があり、単なる一般論ではなく現行Tsubaki.3での公式使用例として扱える。 citeturn25view4turn25view5

競合ルールは53件作成した。大事なのは**「矛盾＝即削除」ではない**ことだ。たとえば次の差がある。

| 組合せ | 判定 | アプリ処理 |
|---|---|---|
| no lineart × thick lineart | 排他的 | 強い警告、どちらを残すか選択 |
| high contrast × low contrast | 排他的 | 原則同時選択防止 |
| greyscale × colorful | 競合〜排他的 | 警告 |
| flat color × gradient shading | 競合 | 共存可、警告 |
| cel shading × painterly shading | 条件付き | ハイブリッドとして許容 |
| hard lighting × soft lighting | 条件付き | key / fillへ分離する提案 |
| warm lighting × cool lighting | 条件付き | 複数光源なら成立 |
| backlighting × rim lighting | 相乗 | 推奨候補 |
| watercolor × paper texture | 相乗 | 推奨候補 |
| pixel art × dithering | 相乗 | 推奨候補 |
| cinematic lighting × film grain | 相乗 | 推奨候補 |

つまり、自動整理は「俺が親切に消しておいたぞ」方式にしてはいけない。親切どころか、ユーザーの意図を殺す。**明白な論理矛盾だけ強く扱い、競合は警告、条件付きは書き換え案、相乗は提案**が妥当だ。

顔立ちについても、完全固定は保証できない。NovelAI公式の画風チュートリアル自身が、そこで扱うstyle tagsは**画像全体のcompositionに影響する**と説明し、promptの前寄りに置くことを推奨している。またquality/aesthetic系tagが狙ったstyleと衝突することも公式に注意されている。 citeturn22view0

したがって、顔への影響リスクは大まかに次のように考えるのが合理的だ。

**高め**なのは、`photorealistic`、`realistic`、`semi-realistic`、`3d rendering`、`pixel art`、`ukiyo-e`、`ligne claire`、`retro cel anime style`など、顔を含む「造形言語そのもの」を変えるもの。

**比較的小さめと予想できる**のは、film grain、paper texture、canvas texture、色温度、ambient lighting、bloomなど、形状ではなく表面・光・後処理に作用するものだ。ただしこれは「ゼロ」ではない。強い逆光やsoft focusだけでも目鼻の見え方は変わる。

NovelAI V4以上では、base promptがscene/style等を決め、character promptを別に持たせる機構が公式提供されている。したがってNAIではstyleをbase prompt側、キャラクター固有情報をcharacter prompt側へ分離するのが特に理にかなっている。 citeturn27view0

Tsubaki.3はPixAI自身がcharacter/style consistencyを強く訴求しており、Technical Reportでもcharacter identityとstyleを別評価軸として扱っている。ただしこれは「styleをいくら変更しても顔が完全に同一」という独立検証結果ではない。そこはベンダーの能力主張と、今回必要な「style変更耐性」を分けて考えるべきだ。 citeturn25view3turn22view7

LoRAについても同様で、PixAI公式資料ではSDXL系とDiT/Tsubaki系でアーキテクチャ互換性を意識する必要があり、Haruka v2はSDXL LoRA ecosystem向けと案内されている。従ってcharacter LoRAを使った顔維持の評価も、**モデルfamilyごとに別試験**にするべきだ。 citeturn23view0

## 検証計画とプリセット設計

ここは明確にしておく。**今回、実際の画像生成によるA/B試験は行っていない。** したがって、辞書内の`Validation_Status`は未実測のものを未実測のまま残してある。コミュニティでよく言われるから、という理由で「検証済み」にはしていない。

代わりに`validation_matrix.csv`へ**486試験行**を作った。

構成は、6 model profiles × 3題材 × 9 conditions × 3 seedsである。

対象profileはPixAI SDXL、Tsubaki.2、Tsubaki.3、NAI V5、NAI V4.5、NAI V3。題材は人物、風景、静物。条件はbaseline、単独線画、単独塗り、単独照明、単独palette、単独effect、strength sweep、意図的競合、cross-category recipeである。

Tsubaki.3 Technical Reportでもstyle/character評価にfixed identity/style prompt banksとmatched seedsを利用しているので、seedや基本promptを固定して差分を見る方針には妥当性がある。 citeturn22view7

人物テストの基本promptは、依頼条件に従って中性的で洗練された青年のhead-and-shoulders portraitにし、**PIXAI検証文には指定された二つの禁止語を含めていない**。Tsubaki用negative prompt列も空欄にしてある。

評価欄はstyle adherence、subject fidelity、composition drift、face identity drift、artifact risk、pairwise notes、image hashを設けた。特に顔変化は「なんとなく違う」だけで済ませず、複数seedで比較し、同じstyle tagについて中央値と分散を見るべきだ。

プリセットは**36種類**作った。固定promptではなく、タグIDと正規化強度の集合として保存している。例として、王道アニメ塗り、現代美麗イラスト、淡彩水彩、セミリアル厚塗り、精緻漫画線画、モノクロ細密ペン画、柔らかなパステル、油彩、映画的強陰影、幻想的逆光、低彩度アンニュイ、鮮やかなゲームCG、レトロセル、ネオン夜景、リーニュ・クレール、木版画、浮世絵、リソグラフ、色鉛筆、ガッシュ絵本、淡墨ウォッシュ、ノワール、ゴールデンアワー、月光ブルー、ピクセル＋ディザなどを収録した。

これらの強度値も**完成済みの最適値ではない**。あくまで「使い始める位置」であり、実験結果を受けて調整する前提だ。

初期UIの72 Coreは、次の考え方で絞った。

画風はanime / manga / semi-real / painterlyなど大きな軸。線画はclean / thin / thick / delicate / bold / sketchy / colored / no lineart。塗りはcel / anime coloring / flat / soft / gradient / painterly / watercolor / oil / gouache。照明はback / rim / side / front / top / under / soft / diffused / hard / volumetric / cinematic / dappled / golden hourを中心にした。

こうしておけば、初期版だけでもかなり広い調合範囲がある。329個をスクロールさせる「罰ゲームUI」にする必要はない。

## Webアプリの実装方針

静的Webアプリとしての技術的障壁は低い。GitHub Pagesはrepository上のHTML/CSS/JavaScriptをそのまま静的サイトとして公開できる。 citeturn21view4

保存は二段階で考える。MVPのレシピ程度なら`localStorage`で足りる。`localStorage`は通常ブラウザsessionをまたいで保持される一方、private browsingでは最後のprivate tabを閉じた際に消えるため、**「端末保存だから絶対消えない」と表示してはいけない。** citeturn24view0

履歴、数百件のrecipe、検索index、将来のthumbnailなどを扱うならIndexedDBに移す。IndexedDBは大量のstructured dataをclient側へ保存し、indexを用いた検索を行うためのAPIとして設計されている。 citeturn24view1

コピーは`navigator.clipboard.writeText()`を利用できる。このAPIはsecure context、つまりHTTPSを要求するため、HTTPSで公開できるGitHub Pagesとの組合せは都合がよい。ただしpermission等で失敗する可能性があるので、手動選択コピーのfallbackを入れるべきだ。 citeturn24view2

JSON importはFileReaderで、ユーザーが明示的に選択したfileをブラウザ上で読める。つまりserver uploadは不要だ。 citeturn24view3

端末保存については`navigator.storage.persist()`でpersistent storageを要求する方法もあるが、ブラウザ側が許可する保証はない。従ってJSON exportによるbackupは残した方がよい。 citeturn24view4

開発段階は次の三つに切るのがいい。

**MVP**は、モデル切替、72 Core、category UI、slider、live preview、36 preset、競合警告、recipe保存、複製・削除、JSON import/export、日英検索、コピー。ここまでサーバー不要でいける。

**第二段階**は、329件すべての詳細表示、お気に入り、recently used、category単位コピー、派生recipe、IndexedDB、実験結果を反映した「verified」badge、Tsubaki experimental numeric-weight mode。

**将来拡張**は、PWA/offline、version migration、LoRA compatibility metadata、reference-image workflow、外部prompt tool向けexport formatだ。クラウド同期だけは、完全静的・アカウントなしという現在の条件とは衝突するので、将来別サービスを足す場合の話になる。

データ構造では、保存recipeにPrompt文字列を直接持たせず、

```json
{
  "schemaVersion": 1,
  "modelProfile": "nai_v5",
  "items": [
    {
      "tagId": "COL_013_watercolor",
      "strength": 1.2
    }
  ]
}
```

のように**不変ID + strength**だけを中核にする。英語表現を後日`watercolor`から別表現へ修正しても、保存recipeが壊れない。

回帰テストで特に見るべきなのは、0のtagが出ない、1.0に不要なwrapperが付かない、SDXL既定で1.5超が出ない、NAI V3へ`::`構文を出さない、NAI V4へnegative numerical emphasisを誤出力しない、Tsubakiの実験的数値weightを正式仕様扱いしない、exclusive競合を勝手に消さない、unknown/deprecated IDのrecipeを部分復元できる、といったところだ。

## 成果物と実装前に残る重要課題

今回の成果物は実ファイルとして生成した。要求された九ファイルに加えて、内容確認用の`manifest.json`と一括ZIPも付けてある。

| 成果物 | 内容 |
|---|---|
| [research_report.md](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/research_report.md) | 調査全体の報告 |
| [style_tags.csv](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/style_tags.csv) | UTF-8 BOM付き・Excelで扱いやすい329件辞書 |
| [style_tags.json](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/style_tags.json) | Web実装用構造化辞書、MVP Coreフラグ入り |
| [model_output_rules.json](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/model_output_rules.json) | PIXAI / NAI別renderer・強度ルール |
| [conflict_rules.json](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/conflict_rules.json) | 53件の排他・競合・相乗・条件付き関係 |
| [style_presets.json](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/style_presets.json) | 36画風preset |
| [validation_matrix.csv](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/validation_matrix.csv) | 486行の比較実験計画 |
| [implementation_notes.md](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/implementation_notes.md) | Claude / Codex向け実装メモ |
| [sources.md](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/sources.md) | 資料名・URL・対象・確認日・信頼度・使用情報 |
| [manifest.json](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24/manifest.json) | 件数・ファイルhash等 |
| **[全成果物ZIPをダウンロード](sandbox:/mnt/data/style_blending_workshop_research_2026-10-24.zip)** | 上記一式 |

最終集計は、**候補329件、9カテゴリ、MVP Core 72件、preset 36件、競合ルール53件、検証計画486行**。Priority分類はS 41件、A 128件、B 66件、C 94件である。なおS/Aが169件あるのに初期実装が72件なのは矛盾ではない。S/Aは「研究上有力な候補」、72件は「初期画面へ常時出す実装subset」と役割を分けている。

対応モデルごとの主要制約はこう整理できる。

**PixAI SDXL**は数値weightを最も素直にsliderへ落とせるが、PixAI公式ガイドに従えば強すぎるweightは避けるべきで、既定上限1.5が妥当だ。 citeturn21search0

**Tsubaki.2**は自然言語優先で、SDXLのtag-stack思想をそのまま持ち込まない方がよい。custom negative promptもmode依存である。 citeturn23view0

**Tsubaki.3**はstyle、lighting、photographic effectsの自然言語制御にかなり強く設計され、公式テンプレにも数値weightの実例はある。しかし、今回確認した資料からはその数値weightをSDXLと同じ仕様だと保証できない。 citeturn25view3turn25view4

**NAI V5/V4.5/V4**は`w::phrase ::`が公式仕様なのでsliderとの対応を最も明確に設計できる。V5は多言語prompt対応、V4/V4.5は英語出力を基本にした方がよい。 citeturn21view1turn25view0turn25view1

**NAI V3**は数値emphasisがないためbrace/bracketへ近似する必要があり、さらにprompt順序の影響も強い。 citeturn21view1turn25view2

そして、実装へ入る前に本当に検証すべき点は六つある。Tsubaki.2/3の`:weight`が単語・短句・長い自然文でどう違うか、Tsubakiの自然言語強弱が照明・色彩・塗りで同程度に機能するか、PixAI SDXLで0.5〜1.5の体感変化がtag種類ごとにどう違うか、NAI V4/V4.5/V5で同じ数値weightの視覚効果がカテゴリをまたいでどの程度変わるか、全体画風tagと照明・texture tagで顔identity driftにどれだけ差があるか、そしてcharacter LoRA併用時にstyle強度が顔再現性をどこから崩し始めるか、である。

ここを測らずに「1.4ならどのモデルでも40％強い」と作ってしまうのが、この企画で一番危ない。**共通sliderは作れる。しかし共通slider値を、共通の物理量だと思ってはいけない。** 画風調合工房の設計上の核心はそこだ。