# NovelAI公式資料との照合データを生成する（v1.1）
# 出力：data/style_tags_nai_official.json（追加タグ）
#       data/nai_official_reconciliation.json（公式タグ全件の照合結果）
#       data/relation_rules_nai.json（公式資料に根拠のある関係）
# 照合日：2026-10-24。公式ページを改めて確認したら、このスクリプトを更新して再生成する。
import json, sys, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
CHECKED = '2026-10-24'
URL_ART = 'https://docs.novelai.net/en/image/tutorial-artstyles/'
URL_ART_JA = 'https://docs.novelai.net/ja/image/tutorial-artstyles/'
URL_TAGS = 'https://docs.novelai.net/en/image/tags/'
URL_EMPH = 'https://docs.novelai.net/en/image/strengthening-weakening/'
NAI_ALL = ['nai_v3', 'nai_v4', 'nai_v45', 'nai_v5']

existing = {t['Prompt'].lower(): t['ID'] for t in json.load(open(os.path.join(ROOT, 'style_tags.json')))['tags']}

# (id, category, subcategory, 日本語名, prompt, aliases, 公式の節, 公式の説明（要旨）, 説明文, 狙い, 顔への影響, V5専用, 基本表示, 類似する既存タグ)
A = []
def add(*row):
    A.append(row)

# ── 制作媒体：メディア区分 ──
add('NAI-TEX-001','medium_texture','media_type','トラディショナルメディア','traditional media',['アナログ','手描き'],'Medium',
    '伝統的な道具で描かれた画像を指す。',
    '紙と画材で描いたアナログ作品らしさを全体に与えるための広いタグ。特定の画材は指定しないので、水彩・鉛筆などは (medium) タグと組み合わせて絞り込む。既存の「アナログ画材の質感」は表面の質感寄りの候補で、こちらは制作手段そのものの区分。',
    'アナログで描いた作品の雰囲気に寄せる','中・仮説',False,True,['REC-TEX-043'])
add('NAI-TEX-002','medium_texture','media_type','疑似トラディショナルメディア','faux traditional media',['アナログ風','デジタルでアナログ風'],'Medium',
    'アナログ風に見えるよう作られたデジタル画像を指す。',
    'デジタル作画のまま、紙や画材の手触りを感じさせる仕上げを狙う。traditional media より線や色面が整いやすいと考えられるが、差は未検証。両方を同時に選ぶこともできる。',
    'デジタル作画にアナログ風の味を加える','低〜中・仮説',False,True,['REC-TEX-043'])
add('NAI-TEX-003','medium_texture','media_type','ミックスメディア','mixed media',['混合技法'],'Medium',
    'アナログとデジタルを組み合わせた作品を指す。',
    '手描きの素材とデジタル処理が混ざった、コラージュ的・重層的な見た目を狙う。画面の統一感が下がることがあるので、色彩系のタグで全体をまとめると扱いやすい。',
    'アナログとデジタルの混在した表現に寄せる','中・仮説',False,False,[])
add('NAI-TEX-004','medium_texture','media_type','非従来型メディア','unconventional media',['変わった画材'],'Medium',
    'デジタルでも伝統的画材でもない媒体を包括するタグ。',
    '砂・布・食べ物・立体物など、一般的な画材以外で作られたような見た目を狙う包括的なタグ。何の素材になるかは指定できず、結果のばらつきが大きいと考えられる。',
    '一般的でない素材で作った作品らしさ','中〜高・仮説',False,False,[])

# ── 制作媒体：(medium) タグ ──
def medium(i, ja, prompt, al, desc, similar, basic=False, face='低〜中・仮説'):
    add(f'NAI-TEX-{i:03d}','medium_texture','medium_tag',ja,prompt,al,'Medium','公式ページの制作媒体タグ一覧に掲載（個別説明なし）。',desc,f'{ja}で描いた作品に寄せる',face,False,basic,similar)
medium(5,'アクリル絵の具（制作媒体）','acrylic paint (medium)',['アクリル','acrylic'],
    'アクリル絵の具で描いた作品として指定する公式タグ。既存の「アクリル画」(acrylic painting)・「アクリル絵具の質感」は英語表現の違う別候補で、併用もできる。',['REC-COL-020','REC-TEX-013'])
medium(6,'ボールペン（制作媒体）','ballpoint pen (medium)',['ボールペン','ballpoint'],
    'ボールペン画らしい、均一で細い筆圧の線や塗り重ねを狙う。色数が少なくなりやすいので、色を出したい場合は色彩タグと組み合わせる。',[])
medium(7,'毛筆（制作媒体）','calligraphy brush (medium)',['毛筆','筆','書道'],
    '書道用の筆で描いたような、太細の強い墨の線を狙う。既存の「書道的な線」(calligraphic lines) は線の性格の候補で、こちらは道具の指定。',['REC-LIN-040','REC-LIN-028'])
medium(8,'色鉛筆（制作媒体）','colored pencil (medium)',['色鉛筆','colored pencil'],
    '色鉛筆で塗ったような、紙目の見える軽い塗りを狙う公式タグ。既存の「色鉛筆描写」(colored pencil rendering) は別表現の候補。',['REC-COL-023'],basic=True)
medium(9,'グラファイト（制作媒体）','graphite (medium)',['鉛筆','黒鉛','graphite'],
    '鉛筆（黒鉛）で描いたような、灰色の線と擦れた陰影を狙う。モノクロ寄りになりやすい。既存の「黒鉛の質感」は表面質感の候補。',['REC-TEX-009','REC-LIN-030'])
medium(10,'インク（制作媒体）','ink (medium)',['インク','ink'],
    'インクで描いた作品として指定する公式タグ。ペン・筆どちらの線にもなり得る広い指定で、道具を絞るなら nib pen (medium) などと組み合わせる。既存の「インク画」(ink drawing) は別表現の候補。',['REC-LIN-027','REC-TEX-015'],basic=True)
medium(11,'マーカー（制作媒体）','marker (medium)',['マーカー','コピック'],
    'アルコールマーカー等で塗ったような、ストロークの重なりが見える塗りを狙う。既存の「マーカー彩色」「マーカーの筆跡」は別表現の候補。',['REC-COL-024','REC-TEX-029'])
medium(12,'ミリペン（制作媒体）','millipen (medium)',['ミリペン','製図ペン'],
    '一定の太さで描けるミリペンの線を狙う。強弱の少ない均一な線になりやすいと考えられる。既存の「ミリペン風の線」(fineliner linework) は別表現の候補。',['REC-LIN-029'])
medium(13,'つけペン（制作媒体）','nib pen (medium)',['つけペン','Gペン','丸ペン'],
    '漫画原稿用のつけペンのような、入り抜きのある線を狙う。モノクロ漫画系のタグと相性がよいと考えられるが未検証。',[])
medium(14,'油絵（制作媒体）','oil painting (medium)',['油絵','油彩'],
    '油絵として指定する公式タグ。既存の「油彩画」(oil painting) とは英語表現が違うため統合していない。どちらが強く効くかは未検証なので、比べて使い分ける。',['REC-COL-019','REC-TEX-012'],basic=True)
medium(15,'ペイント（制作媒体）','painting (medium)',['絵画','ペイント'],
    '絵の具で描いた絵画であることを広く指定する。画材を特定しないので、油絵・水彩などより曖昧な結果になりやすい。',[])
medium(16,'パステル（制作媒体）','pastel (medium)',['パステル'],
    'パステル画として指定する。粉っぽい柔らかな色の重なりを狙う。色名の「パステルカラー」(pastel colors) とは別物で、こちらは画材の指定。',['REC-COL-021','REC-TEX-011'])
medium(17,'ペン画（制作媒体）','pen (medium)',['ペン画','ペン'],
    'ペンで描いた作品として広く指定する。ボールペン・つけペン・ミリペンのような道具の区別はしない。',[])
medium(18,'水彩画（制作媒体）','watercolor (medium)',['水彩','watercolor'],
    '水彩画として指定する公式タグ。既存の「水彩ウォッシュ」(watercolor wash) は塗り技法の候補で、効き方が違う可能性があるため統合していない。にじみや紙目も欲しい場合は質感タグと組み合わせる。',['REC-COL-012','REC-TEX-030'],basic=True)
medium(19,'水彩色鉛筆（制作媒体）','watercolor pencil (medium)',['水彩色鉛筆'],
    '色鉛筆の線と、水でぼかした水彩の色面が混ざった見た目を狙う。色鉛筆・水彩のどちらかを単独で選ぶより中間的になると考えられる。',[])

# ── 制作媒体：デジタル系（画風カテゴリへ） ──
add('NAI-STY-001','style_genre','digital_medium','3D','3d',['blender (medium)','3DCG','ブレンダー'],'Medium',
    '3DCGを指す。代替として blender (medium) も挙げられている。',
    '3DCGで作ったような立体的な画面を狙う。顔の造形まで変わりやすい強いタグ。既存の「3Dレンダリング」(3D rendering) は別表現の候補。',
    '3DCGらしい見た目に寄せる','高・仮説',False,False,['REC-STY-013'])
add('NAI-STY-002','style_genre','digital_medium','Blender（制作媒体）','blender (medium)',['3d','3DCG','ブレンダー'],'Medium',
    '3d の代替タグとして公式に併記。',
    '公式が 3d の代わりとして挙げているタグ。3DCGソフトBlenderで作ったような見た目を狙う。3d と同時に使ってもよいが、ほぼ同じ方向の指定になる。',
    '3DCGらしい見た目に寄せる','高・仮説',False,False,['REC-STY-013'])
add('NAI-STY-003','style_genre','digital_medium','アニメのスクリーンショット','anime screencap',['アニメスクショ','アニメ画面'],'Medium',
    'アニメのスクリーンショット。',
    'テレビアニメの1場面を切り取ったような、セル塗りと背景美術の組み合わせを狙う。顔立ちもアニメ作画寄りに変わりやすい。特定作品の模倣ではなく、一般的なアニメ画面らしさの指定。',
    'アニメ放送画面のような質感','高・仮説',False,False,['REC-STY-001'])

# ── 画風 ──
add('NAI-STY-004','style_genre','general_aesthetic','抽象的','abstract',['surreal','抽象'],'Art style',
    '抽象的（代替として surreal）。',
    '形や色面を抽象化した表現を狙う。具体的な形が崩れやすいので、人物を描く場合は弱めの強度から試す。既存の「抽象画」(abstract painting) は絵画寄りの別候補。',
    '抽象的な表現に寄せる','高・仮説',False,False,['REC-STY-026'])
add('NAI-STY-005','style_genre','general_aesthetic','超現実的','surreal',['abstract','シュール'],'Art style',
    'abstract の代替として公式に併記。',
    '公式が abstract の代わりとして挙げているタグ。夢のような非現実的な組み合わせや空間を狙う。既存の「シュルレアリスム」(surrealism) は美術運動名の候補で別表現。',
    '超現実的な雰囲気','高・仮説',False,False,['REC-STY-025'])
add('NAI-STY-006','style_genre','general_aesthetic','写実的','realistic',['photorealistic','リアル'],'Art style',
    '写実的（代替として photorealistic）。',
    '写実的な描写に寄せる公式タグ。顔立ちや体の描き方も大きく変わる。より写真に近づけたい場合は公式に併記されている photorealistic。既存の「写実的レンダリング」(realistic rendering) は別表現の候補。',
    '写実寄りの描写','高・仮説',False,False,['REC-STY-004','REC-STY-005'])
add('NAI-STY-007','style_genre','general_aesthetic','レトロなアートスタイル','retro artstyle',['レトロ','懐かしい絵柄'],'Art style',
    'レトロなアートスタイル。',
    '一昔前のアニメ・イラストのような絵柄を狙う。具体的な年代を指定したい場合は年タグ（year XXXX）と組み合わせる。既存の「レトロアニメ調」は別表現の候補。',
    '古い時代の絵柄に寄せる','高・仮説',False,True,['REC-STY-018'])
add('NAI-STY-008','style_genre','general_aesthetic','絵画的','painterly',['ペインタリー','厚塗り風'],'Art style',
    '絵画的。',
    '線より色面と筆致で形を作る、絵画的な描き方を狙う公式タグ。既存の「絵画調イラスト」(painterly illustration)・「絵画的陰影」(painterly shading) は別表現の候補で、併用もできる。',
    '筆致で描く絵画的な表現','中〜高・仮説',False,True,['REC-STY-006','REC-COL-004'])
add('NAI-STY-009','style_genre','general_aesthetic','ゲームCG','game cg',['ゲームイラスト','ギャルゲーCG'],'Art style',
    'ゲームCG。',
    'ゲームのイベントCGのような、仕上げの整ったイラストを狙う。既存の「ビジュアルノベル調」(visual novel style) と近いが別表現。',
    'ゲームのイベント絵らしい仕上げ','中〜高・仮説',False,False,['REC-STY-008'])
add('NAI-STY-010','style_genre','general_aesthetic','オフィシャルアート','official art',['公式絵','公式イラスト'],'Art style',
    'オフィシャルアート。',
    '作品の公式イラストのような、整った描線と彩色の宣伝用イラストらしさを狙う。特定作品の画風を指定するものではないが、構図や背景の傾向も変わり得る。',
    '公式宣伝イラストらしい整った仕上げ','中〜高・仮説',False,False,[])
add('NAI-STY-011','style_genre','illustration_print_genre','プロダクションアート','production art',['設定資料','アニメ制作資料'],'Art style',
    'color trace の補足で、組み合わせ候補として挙げられている。',
    'アニメ制作の設定資料・原画のような見た目を狙う。公式は color trace や animation paper との組み合わせを勧めている。人物が設定画のような配置になる可能性がある。',
    'アニメ制作資料らしい見た目','中・仮説',False,False,[])

# ── 線画・技法 ──
add('NAI-LIN-001','linework','stroke_character','スケッチ','sketch',['ラフ','下描き'],'Art style',
    'スケッチ。',
    '完成前の素描のような、ラフな線と未完成感を狙う公式タグ。既存の「スケッチ風の線」(sketchy lines) は線の性格だけを指定する候補で、こちらは絵全体をスケッチにする方向。',
    '素描らしい未完成の味','中・仮説',False,True,['REC-LIN-007'])
add('NAI-LIN-002','linework','stroke_character','ギザギザ線','jaggy lines',['ジャギー','ギザギザ'],'Art style',
    'ギザギザ線。',
    'アンチエイリアスのない、段差の見える線を狙う。お絵描き掲示板や低解像度の絵のような雰囲気になりやすい。oekaki と方向が近い。',
    '段差のある粗い線','低〜中・仮説',False,False,[])
add('NAI-LIN-003','linework','contours_and_weight','輪郭線','outline',['アウトライン','縁取り'],'Art style',
    '輪郭線。',
    '人物や物の外周に輪郭線を付ける方向の指定。ステッカーのような外側の縁取りになる場合もある。既存の「力強い輪郭線」(bold outlines) などは太さや色まで指定する候補。',
    '外周の輪郭線','低〜中・仮説',False,False,['REC-LIN-006','REC-LIN-022'])
add('NAI-LIN-004','linework','line_medium_and_pattern','ベクタートレース','vector trace',['ベクター','トレース'],'Art style',
    'ベクタートレース。',
    '画像をベクター化したような、なめらかで均一な線と平坦な色面を狙う。既存の「ベクターアート」(vector art) は画風全体の候補で別表現。',
    'ベクター化したような均一な線','中・仮説',False,False,['REC-STY-015'])
add('NAI-LIN-005','linework','line_medium_and_pattern','色トレス','color trace',['色トレス','カラートレス'],'Art style',
    '色トレス。公式は production art・animation paper との組み合わせを勧めている。',
    'アニメ原画の色トレス（色鉛筆で引いた色付きの線）のような線を狙う。既存の「色付き輪郭線」(colored outlines) は輪郭の色指定の候補で、こちらは制作工程の表現。',
    'アニメ原画の色トレス線','中・仮説',False,False,['REC-LIN-018'])
add('NAI-LIN-006','linework','stroke_character','お絵描き','oekaki',['お絵描き','お絵かき掲示板'],'Art style',
    'とてもシンプルな道具で描いた、シャープで細い線の絵。',
    'お絵描きソフト・掲示板で描いたような、簡素な道具の細い線を狙う。色数も少なくなりやすい。jaggy lines と方向が近い。',
    '簡素な道具で描いた細い線','中・仮説',False,False,[])
add('NAI-LIN-007','linework','stroke_character','手書き','tegaki',['手書き','マウス描き'],'Art style',
    'マウスやタブレットで手書きしたもの。',
    'マウスやペンタブで手早く描いたような、揺れのある線を狙う。oekaki より道具の簡素さを強調しない指定と考えられるが、差は未検証。',
    '手早い手描きの線','中・仮説',False,False,[])

# ── 質感・支持体 ──
add('NAI-TEX-020','medium_texture','substrate','色紙','shikishi',['色紙','しきし'],'Art style',
    '美術用の和紙の一種。画像の周囲に枠が見えることが多い。',
    'サイン色紙のような台紙に描いたイラストを狙う。公式説明どおり画像の周りに枠が付くことが多いので、全面を使いたい絵には向かない。',
    '色紙に描いたイラストらしさ','低〜中・仮説',False,False,[])
add('NAI-TEX-021','medium_texture','substrate','動画用紙','animation paper',['作画用紙','タップ穴'],'Art style',
    'color trace の補足で、組み合わせ候補として挙げられている。',
    'アニメの作画用紙に描いたような見た目を狙う。用紙の穴や罫線が描き込まれる可能性がある。公式は color trace・production art との組み合わせを勧めている。',
    'アニメ作画用紙らしさ','低〜中・仮説',False,False,[])

# ── 色彩 ──
def pal(i, sub, ja, prompt, al, off, desc, similar, basic=False):
    add(f'NAI-PAL-{i:03d}','color_palette',sub,ja,prompt,al,'Coloring',off,desc,f'{ja}に寄せる','低〜中・仮説',False,basic,similar)
pal(1,'saturation_and_brightness','カラフル','colorful',['カラフル','色鮮やか'],'カラフル。',
    '多くの色を使った賑やかな配色を狙う。既存の「鮮やかな色」(vibrant colors) は彩度の高さを指す候補で、こちらは色数の多さ寄りと考えられる。',['REC-PAL-003'],basic=True)
pal(2,'saturation_and_brightness','ダーク','dark',['暗い','ダーク'],'ダーク。',
    '全体を暗い色調にする指定。場面そのものが暗い（夜・暗所）解釈になることもある。既存の「暗色パレット」(dark palette) は配色の候補。',['REC-PAL-028'])
pal(3,'palette_basic','部分塗り','partially colored',['部分着色'],'画像の一部だけに色が付いている。',
    '線画やモノクロの中に、一部だけ色が入った表現を狙う。どこに色が付くかは指定できない。spot color はさらに一か所に絞った強調。',[])
pal(4,'palette_basic','スポットカラー','spot color',['差し色','ワンポイントカラー'],'強調のため一か所だけに色が付いている。',
    'モノクロ画面の一か所だけを色で強調する表現を狙う。既存の「モノクロに差し色」(grayscale with accent color) は別表現の候補。',['REC-PAL-022'],basic=True)
pal(5,'palette_basic','くすみカラー','muted color',['くすみ','muted colors'],'くすみカラー。',
    '彩度を抑えた落ち着いた色を狙う公式タグ。既存の「くすんだ色」(muted colors) は複数形の表記揺れで、効き方が同じかは未検証のため両方残している。',['REC-PAL-001'])
pal(6,'saturation_and_brightness','淡い色','pale color',['淡色','ペールカラー'],'淡い色。',
    '明るく薄い色づかいを狙う。pastel colors より彩度・濃度ともに薄い方向と考えられる。既存の「淡色パレット」(pale palette) は別表現の候補。',['REC-PAL-027','REC-PAL-004'],basic=True)
pal(7,'palette_tones','セピア','sepia',['セピア','茶色い写真'],'セピア。',
    '古い写真のような茶色の単色調を狙う公式タグ。既存の「セピア調」(sepia tone) は別表現の候補。',['REC-PAL-018'])
themes = [
    ('aqua','水色','水色'),('black','黒','黒'),('blue','青','青'),('brown','茶色','茶'),('green','緑','緑'),('grey','灰色','灰'),
    ('orange','オレンジ','オレンジ'),('pink','ピンク','ピンク'),('purple','紫','紫'),('red','赤','赤'),('white','白','白'),('yellow','黄色','黄'),
]
for n,(en,ja,short) in enumerate(themes, start=1):
    add(f'NAI-PAL-{100+n:03d}','color_palette','color_theme',f'{ja}テーマ',f'{en} theme',[f'{ja}基調',f'{short}系',f'{en}'],'Coloring',
        f'{ja}をテーマにする。',
        f'画面全体を{ja}を基調とした配色にまとめる。背景や小物まで{ja}寄りになることがある。複数のテーマを同時に選ぶこともできるが、配色が濁る可能性がある。',
        f'{ja}基調の配色','低・仮説',False,False,[])

# ── 特殊効果 ──
add('NAI-SHA-001','shadow_contrast','shadow_type','ドロップシャドウ','drop shadow',['ドロップシャドウ'],'Special effects',
    'ドロップシャドウ。',
    '人物や文字の背後に、ずらした影を落とすグラフィック的な効果を狙う。光源による自然な影ではなく、切り抜き素材のような見た目になりやすい。既存の「投影された影」(cast shadows) とは別物。',
    '背後にずらした影を付ける','低・仮説',False,False,['REC-SHA-004'])
add('NAI-ATM-001','atmosphere_print','manga_effect','強調線','emphasis lines',['speed lines','motion lines','集中線'],'Special effects',
    '強調線（代替として speed lines、motion lines）。',
    '漫画の集中線・効果線のような線を画面に加える。人物の周りや背景に線が入り、構図の印象も変わる。',
    '漫画的な効果線','低・仮説',False,False,[])
add('NAI-ATM-002','atmosphere_print','manga_effect','スピード線','speed lines',['emphasis lines','流線'],'Special effects',
    'emphasis lines の代替として公式に併記。',
    '公式が emphasis lines の代わりとして挙げているタグ。速さを表す平行な流線を加える方向と考えられる。',
    '速さを示す流線','低・仮説',False,False,[])
add('NAI-ATM-003','atmosphere_print','manga_effect','モーション線','motion lines',['emphasis lines','動き線'],'Special effects',
    'emphasis lines の代替として公式に併記。',
    '公式が emphasis lines の代わりとして挙げているタグ。動きの軌跡を示す線を加える方向と考えられる。既存の「モーションブラー」(motion blur) はぶれの表現で別物。',
    '動きを示す線','低・仮説',False,False,['REC-OPT-014'])
add('NAI-ATM-004','atmosphere_print','printing_texture','ディザリング','dithering',['ディザ','ドット'],'Medium / Special effects',
    'ピクセルアートでよく使われるシェーディング技法。公式は pixel art との組み合わせを勧めている。',
    '少ない色を点のパターンで混ぜて階調を作る技法を狙う。公式は pixel art との組み合わせを勧めている。既存の「ドット陰影」(dot shading) は別表現の候補。',
    '点のパターンによる階調','低・仮説',False,True,['REC-ATM-015'])
add('NAI-OPT-001','optical_effects','optical_artifact','グリッチ','glitch',['グリッチ','ノイズ','バグ表現'],'Special effects',
    'グリッチ。',
    'デジタル映像の乱れ（ずれ・ノイズ・色ずれ）のような効果を狙う。画像の一部が崩れたように見えるので、弱めの強度から試す。既存の「色収差」(chromatic aberration) は色のにじみだけを指す。',
    'デジタルの乱れ効果','中・仮説',False,False,['REC-OPT-004'])

# ── V5 専用（Tagging ページ「Other Tags」） ──
add('NAI-SHA-101','shadow_contrast','contrast_distribution','陰影の奥行き（V5）','depthness',['奥行き','深み'],'Other Tags',
    '画像の陰影に深みを与える。V5専用。',
    'NovelAI V5 専用。陰影の階調を深くして立体感を出す方向のタグ。V5以外の出力先では出力しない。',
    '陰影に奥行きを出す','中・仮説',True,False,['REC-SHA-001'])
add('NAI-STY-101','style_genre','era','年代傾向：ノベル期（V5）','meta:novel era',['novel era','少し前の絵柄'],'Other Tags',
    '絵柄をわずかに少し古い方向（あまり現代的でない方向）へ寄せる。V5専用。',
    'NovelAI V5 専用。絵柄の時代感を控えめに古い方向へずらすメタタグ。効果は微妙とされている。年タグ（year XXXX）とは別の仕組み。',
    '絵柄をやや古い時代へ','中・仮説',True,False,[])
add('NAI-STY-102','style_genre','era','年代傾向：ゴールデン期（V5）','meta:golden era',['golden era','やや新しい絵柄'],'Other Tags',
    '絵柄をわずかに現代寄りの方向へ寄せる。V5専用。',
    'NovelAI V5 専用。絵柄の時代感を控えめに新しめの方向へずらすメタタグ。meta:novel era と同時に使うと打ち消し合う可能性がある。',
    '絵柄をやや新しい時代へ','中・仮説',True,False,[])
add('NAI-STY-103','style_genre','general_aesthetic','ビジュアルノベルの絵柄（V5）','visual novel art',['ビジュアルノベル','ノベルゲーム'],'Other Tags',
    'ビジュアルノベルに見られるスタイルの画像を探るためのタグ。V5専用。',
    'NovelAI V5 専用。ノベルゲームのイラストの絵柄を狙う。既存の「ビジュアルノベル調」(visual novel style) は全モデル向けの別表現の候補。',
    'ノベルゲームの絵柄','高・仮説',True,False,['REC-STY-008'])
add('NAI-STY-104','style_genre','general_aesthetic','ビジュアルノベルのCG（V5）','visual novel cg',['イベントCG','ノベルゲームCG'],'Other Tags',
    'ビジュアルノベルに見られるスタイルの画像を探るためのタグ。V5専用。',
    'NovelAI V5 専用。ノベルゲームのイベントCG（一枚絵）の仕上げを狙う。game cg と方向が近いが別のタグ。',
    'ノベルゲームの一枚絵','高・仮説',True,False,['REC-STY-008'])

# ── 書き出し ──
tags = []
seen = set()
for (i,cat,sub,ja,p,al,sec,offsum,desc,eff,face,v5,basic,sim) in A:
    assert i not in seen, i; seen.add(i)
    assert p.lower() not in existing, f'既存と完全一致: {p}'
    support = {'nai_v5':'official'} if v5 else {k:'official' for k in NAI_ALL}
    if v5:
        support.update({k:'unsupported' for k in ['nai_v3','nai_v4','nai_v45','pixai_sdxl','pixai_tsubaki2','pixai_tsubaki3']})
    else:
        support.update({k:'unverified' for k in ['pixai_sdxl','pixai_tsubaki2','pixai_tsubaki3']})
    url = URL_TAGS if sec == 'Other Tags' else URL_ART
    tags.append({
        'ID': i, 'Original_ID': None, 'Category': cat, 'Subcategory': sub,
        'Name_JA': ja, 'Name_EN': p, 'Prompt': p,
        'Description_JA': desc, 'Intended_Effect': f'{eff}（画像での効果は未検証）',
        'Evidence_Level': 'nai_official_listed', 'Source_URL': url,
        'PIXAI_SDXL': '公式対応の記載なし（V5専用）' if v5 else '未検証（NovelAI公式タグ。PIXAIでの扱いは未確認）',
        'PIXAI_Tsubaki2': '公式対応の記載なし（V5専用）' if v5 else '未検証（NovelAI公式タグ。PIXAIでの扱いは未確認）',
        'PIXAI_Tsubaki3': '公式対応の記載なし（V5専用）' if v5 else '未検証（NovelAI公式タグ。PIXAIでの扱いは未確認）',
        'NAI': 'NovelAI公式に掲載（V5専用と明記）' if v5 else 'NovelAI公式に掲載（版の制限の記載なし）',
        'Face_Impact': face, 'Conflicts': [], 'Synergies': [], 'Priority': 'NAI', 'MVP_Core': False,
        'Validation_Status': '画像生成による効果検証は未実施',
        'Record_Provenance': f'nai_official_{CHECKED}', 'Original_Metadata_Recovered': False,
        'Aliases': al,
        'Official': {'source': 'NovelAI', 'tag': p, 'url': url, 'urlJa': URL_ART_JA if url == URL_ART else None,
                     'section': sec, 'checkedAt': CHECKED, 'officialSummaryJA': offsum},
        'Model_Support': support, 'Min_Version': 'nai_v5' if v5 else None, 'V5_Only': v5,
        'Basic_View': basic, 'Similar_Existing': sim,
    })

# 公式ページ上の全タグの照合結果
def R(tag, page, section, status, **kw):
    return {'officialTag': tag, 'page': page, 'section': section, 'status': status, **kw}
added = {t['Prompt']: t['ID'] for t in tags}
rec = []
art_sections = {
    'Medium': ['traditional media','faux traditional media','mixed media','unconventional media','acrylic paint (medium)','ballpoint pen (medium)','calligraphy brush (medium)','colored pencil (medium)','graphite (medium)','ink (medium)','marker (medium)','millipen (medium)','nib pen (medium)','oil painting (medium)','painting (medium)','pastel (medium)','pen (medium)','watercolor (medium)','watercolor pencil (medium)','3d','blender (medium)','ai-generated','ai-assisted','anime screencap','pixel art','dithering'],
    'Art style': ['abstract','surreal','art nouveau','impressionism','ligne claire','nihonga','ukiyo-e','realistic','photorealistic','retro artstyle','painterly','sketch','lineart','no lineart','jaggy lines','outline','vector trace','color trace','production art','animation paper','game cg','official art','shikishi','oekaki','tegaki','year XXXX'],
    'Coloring': ['anime coloring','colorful','dark','limited palette','partially colored','spot color','monochrome','greyscale','muted color','pale color','pastel colors','flat color','high contrast','sepia'] + [f'{e} theme' for e,_,_ in themes],
    'Special effects': ['backlighting','bloom','bokeh','chromatic aberration','depth of field','diffraction spikes','dithering','drop shadow','emphasis lines','speed lines','motion lines','glitch','halftone','lens flare','motion blur','soft focus'],
    '(introduction)': ['very aesthetic','aesthetic'],
}
excluded_reason = {
    'ai-generated': '制作手段（AIによる生成）を示すメタ情報で、描画表現を指定するタグではないため。',
    'ai-assisted': '制作手段（AIによる支援）を示すメタ情報で、描画表現を指定するタグではないため。',
    'very aesthetic': '美的評価タグ。今回は品質・美的タグを主な収集対象にしない方針。公式は画風タグと併用する際に [] で弱めることを勧めている。',
    'aesthetic': '同上（美的評価タグ）。',
}
similar_map = {t['Prompt']: t['Similar_Existing'] for t in tags}
seen_tag = set()
for sec, lst in art_sections.items():
    for tg in lst:
        key = (tg, 'tutorial-artstyles')
        if key in seen_tag:
            rec.append(R(tg, URL_ART, sec, 'duplicate_listing', note='同じページの別の節にも掲載。照合は最初の節で実施。'))
            continue
        seen_tag.add(key)
        if tg.lower() in existing:
            rec.append(R(tg, URL_ART, sec, 'exact', existingId=existing[tg.lower()]))
        elif tg in added:
            rec.append(R(tg, URL_ART, sec, 'added', newId=added[tg], similarExisting=similar_map[tg]))
        elif tg == 'year XXXX':
            rec.append(R(tg, URL_ART, sec, 'special_ui', ui='year', note='年タグ専用の設定欄で扱う（year 2024 形式）。'))
        else:
            rec.append(R(tg, URL_ART, sec, 'excluded', reason=excluded_reason[tg]))

tags_page = [
    ('Quality Tags', ['best quality','amazing quality','great quality','normal quality','bad quality','worst quality'], 'excluded', '品質タグ。画風（描画表現）ではなく出来の良し悪しを指定するため、今回は収録しない。'),
    ('Aesthetic Tags', ['masterpiece','top aesthetic','very aesthetic','aesthetic','displeasing','very displeasing'], 'excluded', '美的評価タグ。品質系と同じ理由で今回は収録しない（masterpiece は V4.5以上、top aesthetic は V4以上と公式に記載）。'),
    ('Complexity Tags', ['low complexity','medium complexity','high complexity','ultra complexity'], 'special_ui', '複雑度の専用設定（排他選択）で扱う。V5専用と公式に記載。'),
    ('Year Tags', ['year XXXX'], 'special_ui', '年タグ専用の設定欄で扱う。'),
    ('Dataset Tags', ['fur dataset','background dataset'], 'excluded', '学習データの区分を切り替えるタグで、題材（獣人・背景）が主体になるため。'),
    ('Alpha Transparency Tags', ['transparent background','has alpha','alpha transparency'], 'excluded', '背景の透過という出力形式の指定で、画風ではないため。V5専用と公式に記載。'),
    ('Other Tags', ['location'], 'excluded', '場所（屋内・屋外）の指定で、画風ではないため。'),
    ('Other Tags', ['attractive male'], 'excluded', '人物の容姿の指定で、アプリの方針（人物を指定しない）に反するため。V5専用。'),
    ('Other Tags', ['visual novel bg'], 'excluded', '人物のいない背景画像という題材・構図の指定が主体のため。V5専用。'),
    ('Other Tags', ['visual novel sprite'], 'excluded', '立ち絵という構図・人物配置の指定が主体のため。V5専用。'),
    ('Other Tags', ['visual novel chibi'], 'excluded', 'ちびキャラという人物の頭身の指定が主体のため。V5専用。'),
]
for sec, lst, status, why in tags_page:
    for tg in lst:
        if status == 'excluded':
            rec.append(R(tg, URL_TAGS, sec, 'excluded', reason=why))
        else:
            rec.append(R(tg, URL_TAGS, sec, 'special_ui', ui='complexity' if 'complexity' in tg else 'year', note=why))
for tg in ['depthness','meta:novel era','meta:golden era','visual novel art','visual novel cg']:
    rec.append(R(tg, URL_TAGS, 'Other Tags', 'added', newId=added[tg], similarExisting=similar_map[tg]))
rec.append(R('simple illustration', URL_EMPH, 'Negative Numerical Emphasis', 'excluded',
             reason='強調構文の説明用の例（負の強調）として出てくるだけで、画風タグとしての説明がないため。このアプリは負の強調を出力しない。'))

# 既存タグのうち、公式ページで同一文字列を確認できたもの
exact_existing = sorted({r['existingId'] for r in rec if r['status'] == 'exact'})

recon = {
    'schemaVersion': 1,
    'checkedAt': CHECKED,
    'sources': [
        {'title': 'NovelAI Docs – Prompting for Unique Artstyles', 'url': URL_ART},
        {'title': 'NovelAI Docs – Unique Artstyles（日本語版）', 'url': URL_ART_JA},
        {'title': 'NovelAI Docs – Tagging', 'url': URL_TAGS},
        {'title': 'NovelAI Docs – Strengthening & Weakening', 'url': URL_EMPH},
    ],
    'note': '公式資料に掲載されていることと、画像生成で期待どおりの効果が確認されたことは別の情報。このファイルは前者のみを扱う。',
    'officialExactExistingIds': exact_existing,
    'complexity': {
        'tags': ['low complexity','medium complexity','high complexity','ultra complexity'],
        'url': URL_TAGS, 'checkedAt': CHECKED, 'supportedProfiles': ['nai_v5'],
        'officialNoteJA': '複雑度タグはV5モデルでのみ利用可能。通常は high complexity、様式化した絵では ultra や low が合うこともあるので試して調整、という案内。',
    },
    'year': {'format': 'year {YYYY}', 'url': URL_TAGS, 'urlArt': URL_ART, 'checkedAt': CHECKED,
             'officialNoteJA': 'year XXXX 形式で、その年の絵柄の傾向に寄せる。どの年でも使えるはずだが結果はまちまち、と案内されている。'},
    'entries': rec,
}

rules = []
def rule(t, a, b, reason, basis):
    rules.append({'id': f'NAI-CR-{len(rules)+1:03d}', 'type': t, 'tagIds': [a, b], 'tagPrompts': [],
                  'reason_JA': reason, 'recommended_ui_action': {'synonym':'show_synonym_note','similar':'show_variant_note','synergy':'suggest_optional_pair'}[t],
                  'evidence': basis, 'source_url': URL_ART, 'origin': f'nai_official_{CHECKED}'})
P = {t['Prompt']: t['ID'] for t in tags}
rule('synonym', P['3d'], P['blender (medium)'], '公式資料が 3d の代替として blender (medium) を併記している。', 'official_alternative')
rule('synonym', P['abstract'], P['surreal'], '公式資料が abstract の代替として surreal を併記している。', 'official_alternative')
rule('synonym', P['realistic'], existing['photorealistic'], '公式資料が realistic の代替として photorealistic を併記している。', 'official_alternative')
rule('synonym', P['emphasis lines'], P['speed lines'], '公式資料が emphasis lines の代替として speed lines を併記している。', 'official_alternative')
rule('synonym', P['emphasis lines'], P['motion lines'], '公式資料が emphasis lines の代替として motion lines を併記している。', 'official_alternative')
rule('similar', P['muted color'], existing['muted colors'], '単数形・複数形の表記揺れ（公式表記は muted color）。効き方が同じかは未検証のため両方残す。', 'spelling_variant')
rule('synergy', existing['pixel art'], P['dithering'], '公式資料が pixel art と dithering の組み合わせを勧めている。', 'official_tip')
rule('synergy', P['color trace'], P['production art'], '公式資料が color trace と production art の組み合わせを勧めている。', 'official_tip')
rule('synergy', P['color trace'], P['animation paper'], '公式資料が color trace と animation paper の組み合わせを勧めている。', 'official_tip')
prompts = {**{v: k for k, v in existing.items()}, **{t['ID']: t['Prompt'] for t in tags}}
for r in rules:
    r['tagPrompts'] = [prompts[x] if x in prompts else x for x in r['tagIds']]
    # 既存タグの Prompt は原文の大小文字で
orig = {t['ID']: t['Prompt'] for t in json.load(open(os.path.join(ROOT, 'style_tags.json')))['tags']}
for r in rules:
    r['tagPrompts'] = [orig.get(x) or next(t['Prompt'] for t in tags if t['ID'] == x) for x in r['tagIds']]

json.dump({'schemaVersion': 1, 'origin': f'nai_official_{CHECKED}', 'checkedAt': CHECKED,
           'note': 'NovelAI公式資料に掲載されたタグの追加分。既存の style_tags.json（再構築版329件）は変更していない。画像生成による効果は未検証。',
           'tags': tags}, open(os.path.join(ROOT, 'style_tags_nai_official.json'), 'w'), ensure_ascii=False, indent=1)
json.dump(recon, open(os.path.join(ROOT, 'nai_official_reconciliation.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({'schemaVersion': 1, 'origin': f'nai_official_{CHECKED}', 'rules': rules},
          open(os.path.join(ROOT, 'relation_rules_nai.json'), 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print('added', len(tags), Counter(t['Category'] for t in tags))
print('recon', Counter(r['status'] for r in rec), 'entries', len(rec))
print('exact existing', len(exact_existing))
print('basic additions', sum(t['Basic_View'] for t in tags))
print('rules', len(rules))
