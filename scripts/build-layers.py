# v1.2：品質調合・仕上げディテールの辞書を生成する
# 出力：data/quality_tags.json / data/detail_tags.json / data/quality_presets.json / data/detail_presets.json
#       data/layer_relations.json / data/layer_reconciliation.json
# 照合日：2026-10-24。資料A（品質タグ調査）・資料B（人物ディテール調査）を出発点に、公式資料と照合した結果。
import json, os, re
from collections import Counter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
CHECKED = '2026-10-24'
PROFILES = ['pixai_sdxl', 'pixai_tsubaki2', 'pixai_tsubaki3', 'nai_v4', 'nai_v45', 'nai_v5', 'nai_v3']
NAI = ['nai_v3', 'nai_v4', 'nai_v45', 'nai_v5']

SRC = {
    'nai_tags': ('NovelAI Docs – Tagging（品質タグ・美的タグ）', 'https://docs.novelai.net/en/image/tags/'),
    'nai_qt': ('NovelAI Docs – 品質タグ追加の切替え', 'https://docs.novelai.net/en/image/qualitytags/'),
    'nai_v45': ('NovelAI Diffusion V4.5 Full Release（公式ブログ）', 'https://blog.novelai.net/novelai-diffusion-v4-5-full-release-678318c86205'),
    'pixai_panel': ('PixAI Docs – 生成ページガイド（品質タグ）', 'https://docs.pixai.art/ja/docs/tools/panel-tools'),
    'pixai_blog': ('PixAI公式ブログ – プロンプトの書き方', 'https://blog.pixai.art/ja/how-to-write-pixai-prompts-formula-ja/'),
    'ts3': ('PixAI Docs – Tsubaki.3 Prompt Templates', 'https://docs.pixai.art/docs/models/tsubaki3-prompts'),
    'ts2': ('PixAI – Tsubaki.2 Guide', 'https://pixai.art/en/tsubaki-2/guide'),
    'haruka': ('PixAI Docs – Other Models（Haruka v2）', 'https://docs.pixai.art/docs/models/other-models'),
    'manusA': ('資料A：PIXAI／NovelAI 品質タグ調査（Manus, 2026-10-24）', ''),
    'manusB': ('資料B：人物ディテール・質感タグ調査レポート（Manus）', ''),
}

# 出典区分（UIで区別して表示）
SOURCE_CLASS = {
    'nai_special': 'NovelAI公式の特殊タグ',
    'official_example': '公式資料・テンプレートに同じ文字列の使用例',
    'official_phrase': '公式の作例文の中に同じ語句（タグとしての掲載ではない）',
    'community_usage': '公開作品などでの使用例（調査資料による。未確認）',
    'research_candidate': '調査資料の候補（公式の使用例なし）',
}

def support(default='unverified', **kw):
    s = {p: default for p in PROFILES}
    s.update(kw)
    return s

def ev(key, note):
    t, u = SRC[key]
    return {'source': t, 'url': u, 'note': note}

QUALITY = []
def q(id, cat, ja, prompt, desc, sclass, sup, evidence, aliases=(), quick=False, layers=('quality',), detail_cat=None, detail_basic=False, nl=None, note=None):
    QUALITY.append(dict(ID=id, Layer='quality', Layers=list(layers), Category=cat, Name_JA=ja, Prompt=prompt, Description_JA=desc,
                        Source_Class=sclass, Model_Support=sup, Evidence=evidence, Aliases=list(aliases), Quick=quick,
                        Detail_Category=detail_cat, Detail_Basic=detail_basic, NL_Template=nl, Caution_JA=note))

# ── 品質評価（NovelAI公式の6段階） ──
nai_all_official = dict(nai_v3='official', nai_v4='official', nai_v45='official', nai_v5='official')
q('QLT-RAT-001', 'quality_rating', '最高の品質', 'best quality',
  'NovelAI公式の品質タグ6段階の最上位。画像全体の出来の良さを上げる方向に働くとされる。amazing quality とは同じ尺度の別段階で、統合しない。PixAIでも公式の定番セットに含まれる。',
  'nai_special', support(**nai_all_official, pixai_sdxl='example', pixai_tsubaki3='example'),
  [ev('nai_tags', '品質タグ（Quality Tags）に掲載'), ev('nai_qt', 'V4 Full・Anime V3 の自動品質タグに含まれる'), ev('pixai_blog', '定番セット masterpiece, best quality, high detail'), ev('pixai_panel', '品質タグの代表例'), ev('ts3', 'テンプレートの品質ブロックに使用例')],
  aliases=['最高品質', 'ベストクオリティ'], quick=True)
q('QLT-RAT-002', 'quality_rating', '素晴らしい品質', 'amazing quality',
  'NovelAI公式の品質タグで、best quality の次の段階。NovelAI V5 の自動品質タグ（Light）に含まれるため、自動品質タグを使っている場合は重複に注意。best quality と併用しても必ず良くなるとは限らない。',
  'nai_special', support(**nai_all_official, pixai_tsubaki3='example'),
  [ev('nai_tags', '品質タグに掲載'), ev('nai_qt', 'V5 Light・V4 Curated・Anime V3 の自動品質タグに含まれる'), ev('ts3', 'テンプレートの品質ブロックに使用例')],
  aliases=['アメージング'], quick=True)
q('QLT-RAT-003', 'quality_rating', '優良な品質', 'great quality',
  'NovelAI公式の品質タグで、6段階の3番目。最上位より控えめな品質指定として、比較実験に使いやすい。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '品質タグに掲載')])
q('QLT-RAT-004', 'quality_rating', '普通の品質', 'normal quality',
  'NovelAI公式の品質タグで、中間の段階。品質を上げるためではなく、品質タグの効き方を比べる基準点として使うためのタグ。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '品質タグに掲載')],
  note='出力に加えると品質を上げる方向には働かない可能性がある。')
q('QLT-RAT-005', 'quality_rating', '悪い品質', 'bad quality',
  'NovelAI公式の品質タグで、低品質側。通常のプロンプトに入れると品質を下げる方向に働くとされる。意図的に崩した比較画像を作るとき以外は使わない。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '品質タグに掲載')],
  note='品質を下げる方向のタグ。このアプリはネガティブプロンプトを作らないので、通常欄に出力される。')
q('QLT-RAT-006', 'quality_rating', '最悪の品質', 'worst quality',
  'NovelAI公式の品質タグの最下位。PixAIでは初期ネガティブプロンプトにも入っている語。通常欄に出すと品質を下げる方向に働くため、比較実験以外では使わない。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '品質タグに掲載'), ev('pixai_panel', '初期ネガティブプロンプトに含まれる（ネガティブ用途）')],
  note='品質を下げる方向のタグ。このアプリはネガティブプロンプトを作らない。')

# ── 美的評価 ──
q('QLT-AES-001', 'aesthetic_rating', 'マスターピース', 'masterpiece',
  '美的評価の最上位。NovelAIでは V4.5 以上の公式タグ（V4.5 で top aesthetic から改称と告知）。V5 の自動品質タグ（Standard）に含まれる。PixAIでも定番セットの先頭に置かれる。',
  'nai_special', support(nai_v3='unsupported', nai_v4='unsupported', nai_v45='official', nai_v5='official', pixai_sdxl='example', pixai_tsubaki3='example'),
  [ev('nai_tags', '「masterpiece (V4.5 or higher only)」'), ev('nai_v45', '「top aesthetic は masterpiece に改称」'), ev('nai_qt', 'V5 Standard・V4.5 の自動品質タグに含まれる'), ev('pixai_blog', '定番セット'), ev('ts3', 'テンプレートの品質ブロックに使用例')],
  aliases=['傑作', 'マスターピース'], quick=True)
q('QLT-AES-002', 'aesthetic_rating', 'トップエステティック', 'top aesthetic',
  'NovelAI V4 で導入された美的評価の最上位タグ。Tagging ページは「V4以上」と記載する一方、V4.5 のリリース告知は masterpiece に改称したと説明しており、公式資料の間で食い違いがある。V4.5 以降では masterpiece を使うのが安全。',
  'nai_special', support(nai_v3='unsupported', nai_v4='official', nai_v45='unverified', nai_v5='unverified'),
  [ev('nai_tags', '「top aesthetic (V4 or higher only)」'), ev('nai_v45', '「renamed to the familiar masterpiece tag」')],
  note='V4.5・V5 での扱いは公式資料間で食い違うため「未検証」として出力する。')
q('QLT-AES-003', 'aesthetic_rating', 'とても美的', 'very aesthetic',
  '画面全体の美しさ・見栄えの傾向を上げる NovelAI 公式の美的タグ。品質タグ（best quality など）とは別の軸。V5 の自動品質タグ（Light・Standard とも）に含まれる。画風タグと一緒に使うと狙った画風を弱めることがあると公式が注意している。',
  'nai_special', support(**nai_all_official, pixai_tsubaki3='example'),
  [ev('nai_tags', '美的タグに掲載'), ev('nai_qt', 'V5 Light/Standard・V4.5 Full・V4・Anime V3 の自動品質タグに含まれる'), ev('ts3', 'テンプレートに使用例')],
  aliases=['ベリーエステティック'], quick=True,
  note='公式の画風チュートリアルは、画風タグと併用する場合に [ ] で弱めることを勧めている。')
q('QLT-AES-004', 'aesthetic_rating', '美的', 'aesthetic',
  'very aesthetic より一段控えめな NovelAI 公式の美的タグ。美的傾向を強く押し出したくないときや、very aesthetic との比較に使う。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '美的タグに掲載')])
q('QLT-AES-005', 'aesthetic_rating', '好ましくない', 'displeasing',
  'NovelAI 公式の美的タグで、美しさを下げる側。意図的に崩した比較画像を作るとき以外は使わない。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '美的タグに掲載')], note='見栄えを下げる方向のタグ。')
q('QLT-AES-006', 'aesthetic_rating', 'とても好ましくない', 'very displeasing',
  'NovelAI 公式の美的タグの最下位。displeasing よりさらに美しさを下げる方向。比較実験用。',
  'nai_special', support(**nai_all_official), [ev('nai_tags', '美的タグに掲載')], note='見栄えを下げる方向のタグ。')

# ── 解像感・鮮明さ ──
q('QLT-RES-001', 'resolution', '高解像度', 'highres',
  '高解像度の画像として扱わせるタグ。実際の出力解像度は変わらず、細部の描き込みや鮮明さの傾向に作用するとされる。PixAI Tsubaki.3 の公式テンプレートに使用例がある。',
  'official_example', support(pixai_tsubaki3='example'),
  [ev('ts3', '「masterpiece, best quality, very aesthetic, highres, best illustration」'), ev('manusA', 'PixAI公開作品での使用例')],
  aliases=['ハイレゾ', '高解像度'], quick=True, note='出力される画像の解像度は変わらない。')
q('QLT-RES-002', 'resolution', '超高解像度', 'absurdres',
  'highres よりさらに高い解像度を示すタグ。NovelAI V4・Anime V3 では公式の自動品質タグに含まれていた。V4.5 以降の自動品質タグには含まれない。highres と同時に使うと効きが重なるかは未検証。',
  'nai_special', support(nai_v3='official', nai_v4='official'),
  [ev('nai_qt', 'V4 Full/Curated・Anime V3 の自動品質タグに含まれる'), ev('manusA', 'PixAI公開作品での使用例（absundres という誤記の例もある）')],
  aliases=['アブサードレス', 'absundres'], note='出力される画像の解像度は変わらない。')
q('QLT-RES-003', 'resolution', '高精細', 'high definition',
  '映像の「HD」に近い、くっきりした精細さを示す一般的な語。品質評価タグではなく、解像感の方向づけ。モデルの学習タグとして認識されるかは未確認。',
  'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')], aliases=['HD'])
q('QLT-RES-004', 'resolution', '8K', '8k',
  '8K画質の写真・映像のような高精細さを示す語。実際の出力が8Kになることはない。写実寄りの質感に引っ張られる可能性がある。PixAI Tsubaki.3 の公式テンプレートに「in 8K」の作例がある。',
  'official_phrase', support(pixai_tsubaki3='example'),
  [ev('ts3', '「Hyper-detailed anime illustration in 8K」'), ev('manusA', 'PixAI公開作品での使用例')],
  note='出力解像度は8Kにならない。写実化に寄る可能性がある。')
q('QLT-RES-005', 'resolution', '8K解像度', '8k resolution',
  'PixAI公式が品質タグの代表例として挙げる語。8k より説明的な表記。実際の出力が8Kになることはない。',
  'official_example', support(pixai_sdxl='example', pixai_tsubaki2='example', pixai_tsubaki3='example'),
  [ev('pixai_panel', '品質タグの代表例「8k resolution（超高画質）」')],
  note='出力解像度は8Kにならない。')
q('QLT-RES-006', 'resolution', 'くっきりした焦点', 'sharp focus',
  'ピントの合った、輪郭のはっきりした画面を狙う語。ボケ（被写界深度）系のタグと逆方向に働く可能性がある。PixAI Tsubaki.3 の公式テンプレートに使用例がある。',
  'official_example', support(pixai_tsubaki3='example'),
  [ev('ts3', '「sharp focus, anime screencap and game CG style」')], aliases=['シャープ', 'ピント'])

# ── 描き込み密度（仕上げディテール「全体」と共有） ──
q('QLT-DEN-001', 'detail_density', '高ディテール', 'high detail',
  '画面全体の情報量・細部の描き込みを増やす方向の語。PixAI公式の定番セットに含まれる。品質評価ではなく描き込み量の指定。highly detailed とは表現が違うため統合していない。',
  'official_example', support(pixai_sdxl='example'),
  [ev('pixai_blog', '定番セット masterpiece, best quality, high detail'), ev('manusB', '全体的な人物ディテールの最優先候補')],
  aliases=['ハイディテール', '描き込み'], quick=True, layers=('quality', 'detail'), detail_cat='overall',
  nl='{m}fine detail across the whole illustration')
q('QLT-DEN-002', 'detail_density', '非常に高密度な描き込み', 'highly detailed',
  'high detail より強めの「非常に細密」を示す語。髪・衣服・背景などが全体的に細かくなる方向。high detail と同時に入れると効きが重なるかは未検証なので、まずどちらか一方で比べる。',
  'research_candidate', support(), [ev('manusB', '全体的な人物ディテールの次点候補。high detail と同時投入せず比較するよう注記')],
  aliases=['細密'], layers=('quality', 'detail'), detail_cat='overall',
  nl='{m}highly detailed rendering across the illustration')
q('QLT-DEN-003', 'detail_density', '超細密', 'ultra detailed',
  '描き込みの量を最大限まで上げる方向の語。ultra-detailed はハイフンの有無だけが違う表記揺れで、どちらが学習タグとして効くかは未確認のため両方残している。',
  'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')], aliases=['ultra-detailed', '超細密'])
q('QLT-DEN-004', 'detail_density', '超細密（ハイフン表記）', 'ultra-detailed',
  'ultra detailed のハイフン付き表記。意味は同じだが、モデルがどちらの表記で学習しているかで効き方が変わる可能性がある。片方ずつ比べるのが安全。',
  'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')], aliases=['ultra detailed'])
q('QLT-DEN-005', 'detail_density', '精緻なディテール', 'intricate details',
  '装飾・線・模様などの細かな要素を精密に描き込む方向。high detail が「量」寄りなのに対し、こちらは「入り組んだ細かさ」寄り。PixAI Tsubaki.2 の作例文に「intricate details in ... hair strands, fabric folds」という使い方がある。',
  'official_phrase', support(pixai_tsubaki2='example'),
  [ev('ts2', '「intricate details in the whales\' textured skin, fish scales, hair strands, fabric folds」'), ev('manusA', 'PixAI公開作品での使用例'), ev('manusB', '全体的な人物ディテールの最優先候補')],
  aliases=['精緻', 'イントリケート'], layers=('quality', 'detail'), detail_cat='overall',
  nl='{m}intricate details in the linework, hair strands and fabric folds')
q('QLT-DEN-006', 'detail_density', '非常に入り組んだ細部', 'highly intricate',
  '画面全体に入り組んだ細かな要素を増やす方向。intricate details より強い言い方。PixAI Tsubaki.3 の公式テンプレートに「highly intricate elements throughout the entire scene」の作例がある。',
  'official_phrase', support(pixai_tsubaki3='example'),
  [ev('ts3', '「highly intricate elements throughout the entire scene」')], note='背景や小物が増える可能性がある。')

# ── 一般的な高品質語 ──
q('QLT-GEN-001', 'general_quality', '高品質', 'high quality',
  '「高品質」を一般的な英語で示す語。NovelAI公式の品質タグ（best quality 等）ではない。モデルの学習タグとして効くかは未確認。',
  'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')], aliases=['ハイクオリティ'])
q('QLT-GEN-002', 'general_quality', '超高品質', 'ultra-high quality',
  'high quality を強めた一般的な語。公式の品質タグではない。high quality と同時に使っても効果が足し算になるとは限らない。',
  'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')])
q('QLT-GEN-003', 'general_quality', '最良のイラスト', 'best illustration',
  'イラストとしての完成度を高く指定する語。PixAI Tsubaki.3 の公式テンプレートの品質ブロックに使用例がある。NovelAIの公式品質タグではない。',
  'official_example', support(pixai_tsubaki3='example'),
  [ev('ts3', '「masterpiece, best quality, very aesthetic, highres, best illustration」')])

# ── 補助（品質評価ではない） ──
q('QLT-AUX-001', 'auxiliary', '文字なし', 'no text',
  '画像内の不要な文字・ロゴを避けるための補助タグ。品質評価タグではない。NovelAI V4 以降の自動品質タグに含まれ、V4.5 のリリース告知でも文字やロゴを避ける用途として紹介されている。',
  'nai_special', support(nai_v4='official', nai_v45='official', nai_v5='official'),
  [ev('nai_v45', '「no text to avoid unwanted texts and logos」'), ev('nai_qt', 'V5 Light/Standard・V4.5・V4 Full の自動品質タグに含まれる')],
  aliases=['文字を消す', 'ノーテキスト'], note='品質を上げるタグではなく、文字の抑制を狙う補助設定。')

# ── 仕上げディテール ──
DETAIL = []
def d(id, cat, ja, prompt, desc, dtype, risk, risk_note, adds, basic, sclass, sup, evidence, nl, aliases=(), caution=None):
    DETAIL.append(dict(ID=id, Layer='detail', Layers=['detail'], Category=cat, Name_JA=ja, Prompt=prompt, Description_JA=desc,
                       Detail_Type=dtype, Risk=risk, Risk_Note=risk_note, Adds_Elements=adds, Detail_Basic=basic,
                       Source_Class=sclass, Model_Support=sup, Evidence=evidence, NL_Template=nl, Aliases=list(aliases), Caution_JA=caution))
B = lambda note='資料Bの候補': [ev('manusB', note)]

# 目・虹彩・まつ毛
d('DTL-EYE-001', 'eyes', '詳細な目', 'detailed eyes',
  '目の内部・輪郭・ハイライトの描き込み量を増やす。目の大きさや形を指定するタグではない（big eyes は外見変更のため収録しない）。', 'density', 'low',
  '描き込み量の調整が主。強すぎると目の印象が変わることがある。', False, True, 'research_candidate', support(), B('目の最優先候補'),
  '{m}detailed rendering inside the eyes, keeping their shape and size unchanged', ['目の描き込み'])
d('DTL-EYE-002', 'eyes', '詳細な虹彩', 'detailed irises',
  '虹彩の模様・線・色の重なりを増やす。detailed eyes より範囲を虹彩に絞った指定。虹彩の色を変えるタグではない。', 'density', 'low',
  '虹彩の内部の描き込みが主。', False, True, 'research_candidate', support(), B('目の最優先候補') + [ev('ts2', '作例文「irises ... rendered with layered gradients and multiple soft highlights」（タグではない）')],
  '{m}detail in the irises with layered gradients, keeping the eye color unchanged', ['虹彩', '瞳の模様'])
d('DTL-EYE-003', 'eyes', '詳細な瞳孔', 'detailed pupils',
  '瞳孔の輪郭・中心・周辺を精密に描く。slit pupils のような瞳孔の形を変える指定とは別。', 'density', 'low',
  '瞳孔まわりの描き込みが主。', False, True, 'research_candidate', support(), B('目の最優先候補') + [ev('haruka', 'Haruka v2 の改善点「refined pupil highlights」（モデルの説明でタグではない）')],
  '{m}precise detail in the pupils', ['瞳孔'])
d('DTL-EYE-004', 'eyes', '詳細なまつ毛', 'detailed eyelashes',
  'まつ毛の本数・線・重なりを細かく描く。defined eyelashes が「くっきりさ」なのに対し、こちらは「描き込み量」寄り。', 'density', 'low',
  'まつ毛の描き込みが主。強すぎるとまつ毛が濃く長く見えることがある。', False, True, 'research_candidate', support(), B('目の最優先候補') + [ev('haruka', 'Haruka v2 の改善点「eyelash layering」（モデルの説明でタグではない）')],
  '{m}detailed, layered eyelashes', ['まつ毛'])
d('DTL-EYE-005', 'eyes', '輪郭のはっきりしたまつ毛', 'defined eyelashes',
  'まつ毛の線を明瞭にし、ぼやけを抑える。本数を増やすより、線のくっきりさを狙う。', 'finish', 'low',
  '線の明瞭さの調整が主。', False, False, 'research_candidate', support(), B('目の次点候補'),
  '{m}clearly defined eyelash lines', ['くっきりまつ毛'])
d('DTL-EYE-006', 'eyes', '目のハイライト', 'eye highlights',
  '瞳に光点・反射光を加える。glossy eyes が目全体のうるおい感なのに対し、こちらは光の点そのもの。数や位置を強く指定すると表情の印象が変わることがある。', 'finish', 'low',
  '反射光の追加が主。強すぎると光点が増えすぎる。', False, True, 'research_candidate', support(), B('目の最優先候補') + [ev('haruka', 'Haruka v2 の改善点「refined pupil highlights」（タグではない）')],
  '{m}soft highlights reflected in the eyes', ['瞳のハイライト', 'キャッチライト'])
d('DTL-EYE-007', 'eyes', '光沢のある目', 'glossy eyes',
  '眼球・瞳にうるおいと光沢を加える。eye highlights より面としてのツヤ寄り。強すぎると涙ぐんだような濡れ表現になる。', 'texture', 'low',
  '表面のツヤの調整が主。強いと涙目のように見えることがある。', False, False, 'official_phrase', support(pixai_tsubaki2='example'),
  B('目の次点候補') + [ev('ts2', '作例文「Her black eyes are large and glossy」（タグではない）')],
  '{m}glossy sheen on the eyes', ['うるうる'], caution='強くすると涙目・濡れ表現に寄ることがある。')
d('DTL-EYE-008', 'eyes', 'グラデーションのある瞳', 'gradation eyes',
  '瞳を滑らかな色の濃淡で描く。PixAI Tsubaki.3 の公式テンプレートに同じ文字列の使用例がある。瞳の色味が変わることがあるので、目の色を固定したいときは弱めに使う。', 'texture', 'medium',
  '瞳の色の見え方が変わる可能性がある。', False, False, 'official_example', support(pixai_tsubaki3='example'),
  B('目の最優先候補') + [ev('ts3', '「vivid anime coloring, gradation eyes, official art style」')],
  '{m}smooth color gradation in the eyes, keeping the eye color unchanged', ['グラデ瞳'])

# 髪
d('DTL-HAI-001', 'hair', '髪の細部描写', 'detailed hair',
  '髪全体の線・束・細部を増やす。髪型や髪色は指定しない。何を細かくするかが曖昧なので、毛筋を描きたいなら fine hair strands と比べる。', 'density', 'low',
  '描き込み量の調整が主。', False, True, 'research_candidate', support(), B('髪の最優先候補'),
  '{m}detailed hair rendering, keeping the hairstyle and hair color unchanged', ['髪の描き込み'])
d('DTL-HAI-002', 'hair', '精緻な髪の束・毛筋', 'intricate hair strands',
  '髪の束や毛筋を複雑かつ精密に描く。fine hair strands が「細い毛筋」なのに対し、こちらは束の入り組み方寄り。', 'density', 'low',
  '毛筋の描き込みが主。', False, True, 'official_phrase', support(pixai_tsubaki2='example'),
  B('髪の最優先候補') + [ev('ts2', '作例文「intricate details in ... hair strands」（タグではない）')],
  '{m}intricate detail in the hair strands, keeping the hairstyle unchanged', ['髪の束'])
d('DTL-HAI-003', 'hair', '細い髪の毛筋', 'fine hair strands',
  '一本一本の細い毛筋を見せて、線の密度を上げる。髪型・髪色は変えない前提で、毛筋の描き方だけを調整する。', 'density', 'low',
  '毛筋の描き方の調整が主。', False, True, 'research_candidate', support(), B('髪の最優先候補'),
  '{m}fine, individually rendered hair strands, keeping the hairstyle and hair color unchanged', ['毛筋', '髪の毛一本一本'])
d('DTL-HAI-004', 'hair', '浮き毛・後れ毛', 'flyaway hairs',
  '顔まわりや髪の外側に、細い浮き毛を少し加える。描き込み量を増やすタグとは違い、髪の要素そのものを新しく足す可能性がある。PixAI Tsubaki.2 の作例文に「fine flyaway hairs」がある。', 'finish', 'medium',
  '新しい浮き毛を追加するため、シルエットが少し変わる可能性がある。', True, True, 'official_phrase', support(pixai_tsubaki2='example'),
  B('髪の最優先候補') + [ev('ts2', '作例文「fine flyaway hairs arc across the face」（タグではない）')],
  'a few {m}fine flyaway hairs', ['後れ毛', 'アホ毛'], caution='新しい毛を描き足す可能性がある。')
d('DTL-HAI-005', 'hair', '柔らかな髪の質感', 'soft hair texture',
  '硬い線や金属的な光沢を避けて、髪を柔らかな触感に見せる。タグより自然文向きの候補。', 'texture', 'low',
  '質感の調整が主。', False, False, 'research_candidate', support(), B('髪の次点候補'),
  '{m}soft texture in the hair', ['ふんわり髪'])
d('DTL-HAI-006', 'hair', 'つやのある髪', 'glossy hair',
  '髪の表面に滑らかな反射を加える。hair sheen より光沢がはっきりした方向。強いと濡れ髪に見える。PixAI Tsubaki.2 の作例文に「glossy hair strands」がある。', 'finish', 'medium',
  '強いと濡れ髪・油っぽさに寄る。shiny hair は光が拡散しやすいため収録していない。', False, False, 'official_phrase', support(pixai_tsubaki2='example'),
  B('髪の次点候補') + [ev('ts2', '作例文「glossy hair strands」（タグではない）')],
  '{m}glossy highlights on the hair', ['ツヤ髪'], caution='強くすると濡れ髪のように見えることがある。')
d('DTL-HAI-007', 'hair', '髪の光沢感', 'hair sheen',
  '髪の表面の反射の滑らかな移り変わりを示す。glossy hair より控えめで、天使の輪のような光の帯を整える方向。Haruka v2 の説明に「hair sheen transitions」の改善がある。', 'finish', 'medium',
  '光沢の帯が増えると髪色の見え方が変わる可能性がある。', False, True, 'official_phrase', support(),
  B('髪の最優先候補') + [ev('haruka', 'Haruka v2 の改善点「better hair sheen transitions」（モデルの説明でタグではない）')],
  '{m}sheen on the hair with smooth light transitions', ['天使の輪'])

# 肌
d('DTL-SKN-001', 'skin', 'なめらかな肌', 'smooth skin',
  '肌の表面を均一で滑らかにする。PixAI Tsubaki.3 の公式テンプレートに同じ文字列の使用例がある。肌の色や顔立ちは指定しない。', 'finish', 'low',
  '表面の滑らかさの調整が主。', False, True, 'official_example', support(pixai_tsubaki3='example'),
  B('肌の最優先候補') + [ev('ts3', '「delicate facial features, smooth skin, masterpiece」')],
  '{m}smooth skin surface', ['すべすべ肌'])
d('DTL-SKN-002', 'skin', '柔らかな肌', 'soft skin',
  '肌の陰影や境界を柔らかくする。soft lighting（光）ではなく肌そのものへの指定。smooth skin が表面の均一さなのに対し、こちらは陰影の柔らかさ寄り。', 'finish', 'low',
  '陰影の柔らかさの調整が主。', False, False, 'research_candidate', support(), B('肌の次点候補'),
  '{m}soft shading on the skin', ['もち肌'])
d('DTL-SKN-003', 'skin', '描き込まれた肌', 'detailed skin',
  '肌の陰影・微細な面・ハイライトを増やす。アニメ調では写実寄りに見えることがある。', 'density', 'medium',
  '写実化や肌の凹凸が強調される可能性がある。', False, False, 'research_candidate', support(), B('肌の次点候補'),
  '{m}fine detail in the skin shading', [], caution='写実寄りに見えることがある。')
d('DTL-SKN-004', 'skin', '肌のテクスチャ', 'skin texture',
  '肌の表面に微細な質感を加える。detailed skin より表面の手触り寄り。強いと毛穴や凹凸のような写実表現になる。', 'density', 'medium',
  '写実化・ざらつきに寄る可能性がある。', False, True, 'research_candidate', support(), B('肌の最優先候補'),
  '{m}subtle texture on the skin surface', ['肌の質感'], caution='強くすると写実的な毛穴・凹凸に寄ることがある。')
d('DTL-SKN-005', 'skin', 'みずみずしい肌', 'dewy skin',
  '薄い水分感と控えめな光沢を加える。skin sheen より「うるおい」寄り。強いと汗や濡れに見える。', 'finish', 'medium',
  '汗・濡れ・プラスチックのような質感に寄る可能性がある。', False, True, 'research_candidate', support(), B('肌の最優先候補'),
  '{m}dewy, lightly moisturized look on the skin', ['うるおい肌'], caution='光沢を強くすると汗・濡れ・プラスチックのような質感に寄ることがある。')
d('DTL-SKN-006', 'skin', 'ほのかに光る肌', 'luminous skin',
  '肌の内側から明るく見えるような控えめなハイライト。肌以外まで発光しやすいので弱めに使う。PixAI Tsubaki.2 の作例文に「luminous skin reflections」がある。', 'finish', 'medium',
  '肌の明るさが変わり、発光表現に寄る可能性がある。', False, False, 'official_phrase', support(pixai_tsubaki2='example'),
  B('肌の次点候補') + [ev('ts2', '作例文「luminous skin reflections」（タグではない）')],
  '{m}luminous reflections on the skin', ['透明感のある肌'], caution='強くすると肌が発光しているように見えることがある。')
d('DTL-SKN-007', 'skin', '光沢のある肌', 'shiny skin',
  'はっきりした反射光（スペキュラー）を肌に置く。PixAI Tsubaki.3 の公式テンプレートに使用例があるが、そこでは :1.3 の強い指定と一緒に使われている。通常は弱めから。', 'finish', 'medium',
  '汗・濡れ・プラスチックのような質感に寄る可能性がある。', False, False, 'official_example', support(pixai_tsubaki3='example'),
  B('肌の最優先候補') + [ev('ts3', '「(chromatic aberration, film_grain, bloom, overexposure, 3D, shiny skin :1.3)」')],
  '{m}specular highlights on the skin', ['テカリ'], caution='光沢を強くすると汗・濡れ・プラスチックのような質感に寄ることがある。')
d('DTL-SKN-008', 'skin', '肌の薄いツヤ', 'skin sheen',
  '水滴より弱い、薄い反射としっとり感。肌のツヤを足す候補の中ではいちばん控えめで、小さな差分を試す最初の候補。', 'texture', 'low',
  '薄いツヤの調整が主。強くすると濡れ感に寄る。', False, True, 'research_candidate', support(), B('肌の最優先候補'),
  '{m}sheen on the skin', ['しっとり肌'], caution='強くすると汗・濡れのように見えることがある。')

# 唇
d('DTL-LIP-001', 'lips', '艶やかな唇', 'glossy lips',
  '唇の表面に明確な光沢を加える。リップグロスを塗ったような見た目になりやすい。唇の厚みや形を変えるタグではない（plump lips は外見変更のため収録しない）。', 'finish', 'low',
  '表面の光沢の調整が主。強いと化粧をした印象になる。', False, True, 'research_candidate', support(), B('唇の最優先候補'),
  '{m}glossy finish on the lips', ['グロス'])
d('DTL-LIP-002', 'lips', '光沢のある唇', 'shiny lips',
  '唇に小さな反射光を置く。glossy lips が面のツヤなのに対し、こちらは光の点寄り。', 'finish', 'low',
  '反射光の追加が主。', False, False, 'research_candidate', support(), B('唇の候補'),
  '{m}small specular highlight on the lips', [])
d('DTL-LIP-003', 'lips', '柔らかな質感の唇', 'soft lips',
  '唇の陰影・輪郭・色の移り変わりを柔らかくする。光沢ではなく柔らかさの指定。', 'texture', 'low',
  '質感の調整が主。', False, True, 'research_candidate', support(), B('唇の最優先候補'),
  '{m}soft texture on the lips', ['ぷるっとした質感'])
d('DTL-LIP-004', 'lips', '控えめな唇の質感', 'subtle lip texture',
  '唇に細かな陰影や縦の質感を弱く加える。強くすると乾燥やひび割れに見えるので、名前どおり控えめに使う。', 'density', 'low',
  '描き込みの調整が主。強いと荒れた唇に見える。', False, True, 'research_candidate', support(), B('唇の最優先候補'),
  '{m}fine natural texture on the lips', [], caution='強くすると乾燥・ひび割れのように見えることがある。')
d('DTL-LIP-005', 'lips', 'うるおいのある唇', 'hydrated lips',
  '薄い水分の光沢と滑らかな表面を加える。glossy lips より自然寄りで、moist lips より扱いやすいとされる候補。', 'texture', 'low',
  '質感の調整が主。', False, True, 'research_candidate', support(), B('唇の最優先候補'),
  '{m}hydrated, smooth surface on the lips', ['うるおい'])
d('DTL-LIP-006', 'lips', '自然な唇のツヤ', 'natural lip sheen',
  '唇本来のごく薄い光沢だけを加える。唇の光沢系では glossy lips より控えめで、化粧感を出したくないときの候補。', 'finish', 'low',
  '薄いツヤの調整が主。', False, True, 'research_candidate', support(), B('唇の最優先候補'),
  '{m}natural sheen on the lips', ['ナチュラルなツヤ'])
d('DTL-LIP-007', 'lips', '滑らかな唇', 'smooth lips',
  '唇のざらつきや余計な線を抑える。subtle lip texture と逆方向に働く可能性がある。', 'texture', 'low',
  '質感の調整が主。', False, False, 'research_candidate', support(), B('唇の次点候補'),
  '{m}smooth surface on the lips', [])
d('DTL-LIP-008', 'lips', '控えめな唇ハイライト', 'subtle lip highlight',
  '唇の一部に小さく淡い反射光を置く。shiny lips より弱い仕上げ。', 'finish', 'low',
  '反射光の追加が主。', False, False, 'research_candidate', support(), B('唇の次点候補'),
  'a {m}small highlight on the lips', [])

# 衣服・装飾・素材
d('DTL-CLO-001', 'clothing', '細部まで描かれた布地', 'detailed fabric',
  '織り目・折り目・縫い目など、布の面の細部を増やす。衣服の種類や色は指定しない。fabric texture が表面の手触りなのに対し、こちらは描き込み量寄り。', 'density', 'low',
  '既存の布の描き込みが主。', False, True, 'research_candidate', support(), B('衣服の最優先候補'),
  '{m}detailed fabric with visible weave and folds, keeping the outfit design unchanged', ['布の描き込み'])
d('DTL-CLO-002', 'clothing', '布地の質感', 'fabric texture',
  '布の表面感（織り・柔らかさ・粗さ）を見せる。PixAI Tsubaki.2 の作例文に「subtle fabric textures」がある。', 'texture', 'low',
  '質感の調整が主。', False, True, 'official_phrase', support(pixai_tsubaki2='example'),
  B('衣服の最優先候補') + [ev('ts2', '作例文「subtle fabric textures」（タグではない）')],
  '{m}fabric texture on the clothing', ['生地感'])
d('DTL-CLO-003', 'clothing', '衣服の細密描写', 'detailed clothing',
  '既存の衣服の皺・縫製・重なり・端部を細かく描く。描き込みが増えると装飾が足されたように見えることがある。detailed clothes は単語違いの近い表現。', 'density', 'medium',
  '装飾が増えたように見え、衣服の印象が変わる可能性がある。', False, False, 'research_candidate', support(), B('衣服の次点候補'),
  '{m}detailed rendering of the existing clothing, keeping its design unchanged', ['服の描き込み'])
d('DTL-CLO-004', 'clothing', '精緻な刺繍', 'intricate embroidery',
  '細かな刺繍糸とステッチを描く。もともと刺繍のない服に刺繍が足される可能性があるため、「要素を追加」として扱う。', 'density', 'medium',
  '刺繍という新しい装飾を足す可能性がある。図柄や色の指定はしない。', True, True, 'research_candidate', support(), B('衣服の最優先候補'),
  '{m}intricate embroidery stitches', ['刺繍'], caution='刺繍のない衣服に刺繍を描き足す可能性がある。')
d('DTL-CLO-005', 'clothing', 'レースの細部', 'lace detail',
  '既存のレースの編み目・透かし・縁を強調する。レースのない服にレースが足される可能性がある。', 'density', 'medium',
  'レースという新しい装飾を足す可能性がある。', True, False, 'research_candidate', support(), B('衣服の次点候補'),
  '{m}fine detail in the lace', ['レース'], caution='レースのない衣服にレースを描き足す可能性がある。')
d('DTL-CLO-006', 'clothing', '金属の質感', 'metallic texture',
  '金属部分の硬さ・反射・細かな表面感を加える。金属以外の部分まで金属的に見えることがある。画風側の「金属的な光沢」(metallic sheen) とは別のタグ。', 'texture', 'medium',
  '金属でない部分まで金属的に見える可能性がある。', False, False, 'official_phrase', support(pixai_tsubaki2='example'),
  B('衣服の次点候補') + [ev('ts2', '作例文「glossy metallic finish」（タグではない）')],
  '{m}metallic texture on the metal parts only', ['メタル'])
d('DTL-CLO-007', 'clothing', '水滴', 'water droplets',
  '素材の表面に小さな水滴とハイライトを加える。水滴という新しい要素を足すタグで、濡れた場面に見えることがある。PixAI Tsubaki.2 の作例文に「water droplets」がある。', 'finish', 'medium',
  '水滴を新しく足し、濡れた状況に見える可能性がある。', True, False, 'official_phrase', support(pixai_tsubaki2='example'),
  B('衣服の次点候補') + [ev('ts2', '作例文「Tiny water droplets / dewdrops cling to hair strands」（タグではない）')],
  'a few {m}small water droplets on the surface', ['しずく'], caution='水滴を描き足し、濡れた場面に見えることがある。')
d('DTL-CLO-008', 'clothing', '衣服の描き込み', 'detailed clothes',
  'detailed clothing とほぼ同じ意味の単語違い。どちらの表記が効くかはモデル次第で、片方ずつ比べるのが安全。', 'density', 'medium',
  '装飾が増えたように見える可能性がある。', False, False, 'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')],
  '{m}detailed clothes, keeping the outfit design unchanged', [])

# 全体
d('DTL-ALL-001', 'overall', '細部のディテール', 'fine details',
  '小さな線・装飾・髪の束・布の折り・ハイライトなど、細部をまんべんなく増やす。high detail と方向が近いため、同時に入れず比べる。', 'density', 'low',
  '描き込み量の調整が主。', False, True, 'research_candidate', support(), B('全体の最優先候補'),
  '{m}fine details throughout', ['細部'])
d('DTL-ALL-002', 'overall', '細密な質感', 'detailed textures',
  '肌・髪・布・金属などの表面感を細かく見せる。描き込み量よりも素材感寄り。写実寄りになることがある。', 'texture', 'low',
  '質感の調整が主。', False, True, 'research_candidate', support(), B('全体の最優先候補'),
  '{m}detailed surface textures on hair, skin and fabric', ['質感'])
d('DTL-ALL-003', 'overall', '洗練された細部', 'refined details',
  '線・陰影・装飾を整理された細部にする。量を増やすより、まとまりを良くする方向の候補。', 'finish', 'low',
  '仕上げの調整が主。', False, False, 'research_candidate', support(), B('全体の次点候補'),
  '{m}refined, well-organized details', [])
d('DTL-ALL-004', 'overall', '磨き込まれたレンダリング', 'polished rendering',
  '線・陰影・色・質感を整えた完成度を狙う。画風が写実寄り・CG寄りに変わることがある。', 'finish', 'low',
  '仕上げの調整が主。画風が動く可能性がある。', False, False, 'research_candidate', support(), B('全体の次点候補'),
  '{m}polished rendering', [], caution='画風が写実・CG寄りに変わることがある。')
d('DTL-ALL-005', 'overall', '描き込まれた背景', 'detailed background',
  '背景の描き込みを増やす。人物の細部ではなく背景が対象で、背景のない絵に背景が加わる可能性がある。', 'density', 'medium',
  '背景という新しい要素を足し、構図の印象が変わる可能性がある。', True, False, 'community_usage', support(), [ev('manusA', 'PixAI公開作品での使用例')],
  '{m}detailed background', ['背景の描き込み'], caution='背景のない絵に背景を描き足す可能性がある。')

DETAIL_LABELS = {'density': '描き込み', 'texture': '質感', 'finish': '仕上げ'}

# ── 書き出し ──
def to_record(x):
    x = dict(x)
    x['Validation_Status'] = '画像生成による効果検証は未実施'
    x['NAI_Tag_Knowledge'] = '未確認（NovelAIのタグ知識表示での確認は未実施）' if x['Source_Class'] != 'nai_special' else 'NovelAI公式の特殊タグ'
    x['Checked_At'] = CHECKED
    x['Source_Class_Label'] = SOURCE_CLASS[x['Source_Class']]
    return x

quality = [to_record(x) for x in QUALITY]
detail = [to_record(x) for x in DETAIL]

# 検査
style = json.load(open(os.path.join(ROOT, 'style_tags.json')))['tags'] + json.load(open(os.path.join(ROOT, 'style_tags_nai_official.json')))['tags']
style_prompts = {t['Prompt'].lower(): t['ID'] for t in style}
all_new = quality + detail
ids = [x['ID'] for x in all_new]
assert len(ids) == len(set(ids)), 'ID重複'
prompts = Counter(x['Prompt'].lower() for x in all_new)
assert not [p for p, n in prompts.items() if n > 1], ('英語プロンプト重複', [p for p, n in prompts.items() if n > 1])
assert not [x['Prompt'] for x in all_new if x['Prompt'].lower() in style_prompts], '画風辞書と重複'
assert not [x for x in all_new if re.search(r'adult|bust', x['Prompt'] + (x.get('NL_Template') or ''), re.I)]
assert len(set(x['Description_JA'] for x in all_new)) == len(all_new), '説明文の使い回し'
for x in all_new:
    assert re.fullmatch(r'[a-z0-9 \-]+', x['Prompt']), x['Prompt']
    if x.get('NL_Template'):
        assert '{m}' in x['NL_Template'], x['ID']

# 仕上げディテール側から見えるタグ（共有タグは品質側のIDを参照）
detail_view = [{'ref': x['ID'], 'detailCategory': x['Detail_Category'], 'basic': x['Detail_Basic']} for x in quality if 'detail' in x['Layers']]

json.dump({'schemaVersion': 1, 'checkedAt': CHECKED, 'layer': 'quality',
           'note': '品質調合の辞書。公式資料への掲載・使用例と、画像生成での効果検証は別の情報として扱う（効果検証はすべて未実施）。',
           'sourceClasses': SOURCE_CLASS,
           'categories': [
               {'key': 'quality_rating', 'label': '品質評価', 'short': '品質', 'color': '#a8823a', 'note': 'NovelAI公式の6段階。画像全体の出来の評価。'},
               {'key': 'aesthetic_rating', 'label': '美的評価', 'short': '美的', 'color': '#c9a24a', 'note': '見栄え・美しさの傾向。品質評価とは別の軸。'},
               {'key': 'resolution', 'label': '解像感・鮮明さ', 'short': '解像', 'color': '#9a8a5a', 'note': '高解像度らしさ・くっきりさ。出力解像度は変わらない。'},
               {'key': 'detail_density', 'label': '描き込み密度', 'short': '密度', 'color': '#8a7440', 'note': '細部の量・入り組み方。品質評価ではない。'},
               {'key': 'general_quality', 'label': '一般的な高品質語', 'short': '一般', 'color': '#b8a77a', 'note': '公式の品質タグではない一般語。'},
               {'key': 'auxiliary', 'label': '補助（品質評価ではない）', 'short': '補助', 'color': '#a0a090', 'note': '不要な文字の抑制など。'},
           ],
           'quickIds': [x['ID'] for x in quality if x['Quick']],
           'tags': quality}, open(os.path.join(ROOT, 'quality_tags.json'), 'w'), ensure_ascii=False, indent=1)

json.dump({'schemaVersion': 1, 'checkedAt': CHECKED, 'layer': 'detail',
           'note': '仕上げディテールの辞書（目・髪・肌・唇・衣服・全体）。外見変更リスクは調査資料と本アプリの判断による暫定分類で、画像生成による実測ではない。',
           'sourceClasses': SOURCE_CLASS,
           'riskLevels': {'low': {'label': '低', 'detail': '主に描画表現・表面の仕上げの調整を意図する'},
                          'medium': {'label': '中', 'detail': '質感以外に外見へ影響する可能性がある'},
                          'high': {'label': '高', 'detail': '人物設定や形状そのものに強く影響する可能性がある（このアプリでは収録しない方針）'}},
           'detailTypes': DETAIL_LABELS,
           'categories': [
               {'key': 'eyes', 'label': '目・虹彩・まつ毛', 'short': '目', 'color': '#3f7f9f'},
               {'key': 'hair', 'label': '髪の描き込み・質感', 'short': '髪', 'color': '#56709a'},
               {'key': 'skin', 'label': '肌の質感', 'short': '肌', 'color': '#5f9a96'},
               {'key': 'lips', 'label': '唇・口元', 'short': '唇', 'color': '#6f8fbf'},
               {'key': 'clothing', 'label': '衣服・装飾・素材', 'short': '衣服', 'color': '#4a6a7a'},
               {'key': 'overall', 'label': '全体の細密さ', 'short': '全体', 'color': '#7a8aa8'},
           ],
           'tsubakiModifiers': {'note': 'Tsubaki用の自然文テンプレートの {m} に入る語。数値との換算ではない（実験的）。',
                                'subtle': 'subtle ', 'gentle': 'light ', 'plain': '', 'pronounced': 'pronounced ', 'intense': 'strongly emphasized '},
           'sharedFromQuality': detail_view,
           'tags': detail}, open(os.path.join(ROOT, 'detail_tags.json'), 'w'), ensure_ascii=False, indent=1)

P = {x['Prompt']: x['ID'] for x in all_new}
def items(*pairs):
    return [{'tagId': P[p], 'strength': s} for p, s in pairs]

qpresets = [
    {'id': 'QPR-00', 'kind': 'clear', 'name_ja': '品質指定なし', 'description_ja': '品質調合を空にします（他の層はそのまま）。モデル側の自動品質タグだけに任せたいときに。', 'items': []},
    {'id': 'QPR-01', 'kind': 'manual', 'name_ja': 'NAI向け品質強調', 'description_ja': 'NovelAI公式の品質・美的タグの組み合わせ。V4.5 以降向け（masterpiece は V4.5 以上の公式タグ）。', 'items': items(('masterpiece', 1.0), ('best quality', 1.0), ('very aesthetic', 1.0)), 'recommended_profiles': ['nai_v45', 'nai_v5']},
    {'id': 'QPR-02', 'kind': 'manual', 'name_ja': 'NAI V5 Light 相当を手動で出力', 'description_ja': 'NovelAI V5 の自動品質タグ（Light）と同じタグを、アプリの出力として書き出します。NovelAI側の「品質タグ追加」をOFFにしているとき用。', 'items': items(('very aesthetic', 1.0), ('amazing quality', 1.0), ('no text', 1.0)), 'recommended_profiles': ['nai_v5']},
    {'id': 'QPR-03', 'kind': 'manual', 'name_ja': 'NAI V5 Standard 相当を手動で出力', 'description_ja': 'NovelAI V5 の自動品質タグ（Standard）と同じタグを、アプリの出力として書き出します。NovelAI側の「品質タグ追加」をOFFにしているとき用。', 'items': items(('very aesthetic', 1.0), ('masterpiece', 1.0), ('no text', 1.0)), 'recommended_profiles': ['nai_v5']},
    {'id': 'QPR-04', 'kind': 'manual', 'name_ja': 'PIXAI向け品質強調', 'description_ja': 'PixAI公式ブログが定番として紹介する3タグ。公式も「盛れば盛るほど良くなるわけではない」と説明している。', 'items': items(('masterpiece', 1.0), ('best quality', 1.0), ('high detail', 1.0)), 'recommended_profiles': ['pixai_sdxl', 'pixai_tsubaki2', 'pixai_tsubaki3']},
    {'id': 'QPR-05', 'kind': 'manual', 'name_ja': '高精細志向', 'description_ja': '解像感と描き込み密度を少し強める組み合わせ。全部を重ねるより2〜3個に絞るほうが比較しやすい。', 'items': items(('best quality', 1.0), ('highres', 1.1), ('ultra detailed', 1.1)), 'recommended_profiles': PROFILES},
    {'id': 'QPR-06', 'kind': 'manual', 'name_ja': '控えめな品質指定', 'description_ja': '品質・美的タグを弱めに入れて、画風への影響を抑えたいとき用。', 'items': items(('best quality', 0.8), ('very aesthetic', 0.8)), 'recommended_profiles': PROFILES},
    {'id': 'QPR-07', 'kind': 'manual', 'name_ja': '比較実験用（1語だけ固定）', 'description_ja': '品質タグを best quality 1語に固定して、画風や仕上げディテールの差だけを比べるための基準。', 'items': items(('best quality', 1.0)), 'recommended_profiles': PROFILES},
]
auto_presets = [
    {'id': 'QAU-OFF', 'kind': 'auto_setting', 'name_ja': 'NovelAIの「品質タグ追加」はOFF', 'autoSetting': 'off', 'description_ja': '記録するだけで、出力には何も加えません。'},
    {'id': 'QAU-LIGHT', 'kind': 'auto_setting', 'name_ja': 'NovelAI V5 の「品質タグ追加」は Light', 'autoSetting': 'light', 'description_ja': 'NovelAI側が末尾に very aesthetic, amazing quality, no text を加えます。アプリの出力には加えず、重複だけを知らせます。'},
    {'id': 'QAU-STD', 'kind': 'auto_setting', 'name_ja': 'NovelAI V5 の「品質タグ追加」は Standard', 'autoSetting': 'standard', 'description_ja': 'NovelAI側が末尾に very aesthetic, masterpiece, no text を加えます。アプリの出力には加えず、重複だけを知らせます。'},
]
json.dump({'schemaVersion': 1, 'note': '品質調合のプリセット。manual はアプリが出力するタグ、auto_setting はサービス側の自動品質タグ設定を記録するだけ（出力しない）。強度は出発点で、効果は未検証。',
           'presets': qpresets, 'autoSettingPresets': auto_presets}, open(os.path.join(ROOT, 'quality_presets.json'), 'w'), ensure_ascii=False, indent=1)

dpresets = [
    {'id': 'DPR-01', 'name_ja': '瞳の細密描写', 'description_ja': '虹彩・まつ毛・ハイライトの描き込みを整える。目の形や色は指定しない。', 'items': items(('detailed irises', 1.2), ('detailed eyelashes', 1.1), ('eye highlights', 1.0))},
    {'id': 'DPR-02', 'name_ja': '繊細な髪の毛筋', 'description_ja': '毛筋の細さと束の描き込み、控えめな光沢。髪型・髪色は指定しない。', 'items': items(('fine hair strands', 1.2), ('intricate hair strands', 1.0), ('hair sheen', 0.8))},
    {'id': 'DPR-03', 'name_ja': '自然な肌の光沢', 'description_ja': '滑らかさと薄いツヤ。光沢を強くすると汗・濡れに見えるため弱めから。', 'items': items(('smooth skin', 1.0), ('skin sheen', 0.8))},
    {'id': 'DPR-04', 'name_ja': '唇の控えめなツヤ', 'description_ja': '唇本来の薄いツヤと小さなハイライト。唇の形は指定しない。', 'items': items(('natural lip sheen', 0.9), ('subtle lip highlight', 0.8))},
    {'id': 'DPR-05', 'name_ja': '布地の細密描写', 'description_ja': '既存の衣服の織り目・折り目と布の質感。衣服の種類は指定しない。', 'items': items(('detailed fabric', 1.1), ('fabric texture', 1.0))},
    {'id': 'DPR-06', 'name_ja': '全体を細密に', 'description_ja': '細部の量と素材感を全体的に上げる。', 'items': items(('fine details', 1.1), ('detailed textures', 1.0))},
]
json.dump({'schemaVersion': 1, 'note': '仕上げディテールのプリセット。強度は出発点で、効果は未検証。', 'presets': dpresets},
          open(os.path.join(ROOT, 'detail_presets.json'), 'w'), ensure_ascii=False, indent=1)

# 関係
rules = []
def rule(t, a, b, reason, basis, url=''):
    rules.append({'id': f'LYR-CR-{len(rules)+1:03d}', 'type': t, 'tagIds': [P[a], P[b]], 'tagPrompts': [a, b], 'reason_JA': reason,
                  'recommended_ui_action': {'synonym': 'show_synonym_note', 'similar': 'show_variant_note', 'conflict': 'show_warning_keep_both'}[t],
                  'evidence': basis, 'source_url': url, 'origin': f'layers_{CHECKED}'})
rule('synonym', 'top aesthetic', 'masterpiece', 'NovelAI V4.5 のリリース告知で top aesthetic は masterpiece に改称と説明されている（Tagging ページは両方を記載）。', 'official_rename', SRC['nai_v45'][1])
rule('similar', 'ultra detailed', 'ultra-detailed', 'ハイフンの有無だけが違う表記揺れ。どちらが効くかは未確認のため両方残す。', 'spelling_variant')
rule('similar', '8k', '8k resolution', '同じ「8K」を示す短い表記と説明的な表記。', 'spelling_variant')
rule('similar', 'detailed clothing', 'detailed clothes', 'clothing と clothes の単語違い。どちらが効くかは未確認のため両方残す。', 'spelling_variant')
pos_q, neg_q = ['best quality', 'amazing quality', 'great quality'], ['bad quality', 'worst quality']
pos_a, neg_a = ['masterpiece', 'top aesthetic', 'very aesthetic', 'aesthetic'], ['displeasing', 'very displeasing']
for a in pos_q:
    for b in neg_q:
        rule('conflict', a, b, 'NovelAI公式の品質タグの同じ尺度の、反対側の段階。比較実験以外で同時に使うと打ち消し合う可能性がある。', 'official_scale_opposite', SRC['nai_tags'][1])
for a in pos_a:
    for b in neg_a:
        rule('conflict', a, b, 'NovelAI公式の美的タグの同じ尺度の、反対側の段階。比較実験以外で同時に使うと打ち消し合う可能性がある。', 'official_scale_opposite', SRC['nai_tags'][1])
json.dump({'schemaVersion': 1, 'origin': f'layers_{CHECKED}', 'note': '品質・仕上げディテールの関係。根拠のあるものだけ。', 'rules': rules},
          open(os.path.join(ROOT, 'layer_relations.json'), 'w'), ensure_ascii=False, indent=1)

# 照合結果（候補の採否と理由）
spec_quality = ['best quality', 'amazing quality', 'great quality', 'normal quality', 'bad quality', 'worst quality', 'masterpiece', 'top aesthetic', 'very aesthetic', 'aesthetic', 'displeasing', 'very displeasing',
                'highres', 'absurdres', 'high quality', 'ultra-high quality', 'high detail', 'highly detailed', 'ultra detailed', 'ultra-detailed', '8k', '8k resolution', 'high definition', 'intricate details', 'no text']
manus_detail = ['detailed eyes', 'detailed irises', 'detailed pupils', 'detailed eyelashes', 'defined eyelashes', 'eye highlights', 'glossy eyes', 'gradation eyes',
                'detailed hair', 'intricate hair strands', 'fine hair strands', 'flyaway hairs', 'soft hair texture', 'glossy hair', 'hair sheen',
                'smooth skin', 'soft skin', 'detailed skin', 'skin texture', 'dewy skin', 'luminous skin', 'shiny skin', 'skin sheen',
                'glossy lips', 'shiny lips', 'soft lips', 'subtle lip texture', 'hydrated lips', 'natural lip sheen', 'smooth lips', 'subtle lip highlight',
                'detailed fabric', 'fabric texture', 'detailed clothing', 'intricate embroidery', 'lace detail', 'metallic texture', 'water droplets',
                'intricate details', 'fine details', 'detailed textures', 'refined details', 'high detail', 'highly detailed', 'polished rendering']
assert len(manus_detail) == 45
excluded = [
    ('big eyes', 'detail', '目の大きさ・顔立ちを変える外見設定のため（資料Bも見送り）。'),
    ('shiny hair', 'detail', '髪全体の光沢や濡れ髪へ拡散しやすい（資料Bの見送り候補）。代わりに hair sheen / glossy hair を収録。'),
    ('airy, semi-transparent hair strands', 'detail', '髪全体の透明化や光学効果に逸れやすい（資料Bの見送り候補）。'),
    ('matte skin', 'detail', '反射を抑えすぎて平坦化し、差分として不安定（資料Bの見送り候補）。'),
    ('subtle pores', 'detail', 'アニメ表現で写実化・点状ノイズに寄りやすく、根拠も弱い（資料Bの見送り候補）。'),
    ('plump lips', 'detail', '唇の厚み・形を変える外見設定のため。'),
    ('polished metal', 'detail', '反射が強く、金属以外に波及しやすい（資料Bの見送り候補）。代わりに metallic texture を収録。'),
    ('glass-like', 'detail', '透明化・背景効果に逸れやすい（資料Bの見送り候補）。'),
    ('high complexity', 'detail', 'NovelAI V5 の画面全体の複雑度タグ。既存の「複雑度」設定で扱う。'),
    ('highly detailed face', 'detail', '顔立ち・表情・目の印象を変えやすい（資料Bの見送り候補）。'),
    ('pale skin / tan skin', 'detail', '肌の色の指定（人物設定）のため。'),
    ('髪型・髪色の指定', 'detail', '人物の外見設定のため。人物設定側のツールで扱う。'),
    ('lowres, low quality, bad anatomy, bad hands, text, error, missing fingers, jpeg artifacts, signature, watermark', 'quality', 'PixAIの初期ネガティブプロンプトに含まれる語。ネガティブプロンプト生成は今回の対象外で、人物の破綻に関するタグは品質調合の中心に含めない。'),
    ('beautiful anime aesthetic', 'quality', '画風の方向まで含む抽象的な語で、品質評価・描き込み密度のどちらにも当てはまらず、根拠も公開作品の使用例のみ。'),
    ('location / rating:general / -0.8::feet::', 'quality', 'NovelAI V4.5・V4 の自動品質タグに含まれるが、場所・レーティング・部位の指定で、品質評価ではないため。'),
    ('absundres', 'quality', 'absurdres の誤記（資料A）。absurdres の別名として検索できるようにした。'),
]
def status_of(p):
    return 'included' if p in P else 'missing'
recon = {
    'schemaVersion': 1, 'checkedAt': CHECKED,
    'note': '資料A・B と依頼書に挙がった候補の採否。公式資料での確認状況は各タグの Evidence を参照。',
    'sources': [{'title': t, 'url': u} for t, u in SRC.values() if u],
    'qualityCandidates': [{'tag': p, 'status': status_of(p), 'id': P.get(p)} for p in spec_quality],
    'detailCandidatesFromReportB': [{'tag': p, 'status': status_of(p), 'id': P.get(p)} for p in manus_detail],
    'additions': [{'tag': p, 'id': P[p], 'reason': r} for p, r in [
        ('sharp focus', 'PixAI Tsubaki.3 の公式テンプレートに使用例'), ('highly intricate', 'PixAI Tsubaki.3 の公式テンプレートに使用例'),
        ('best illustration', 'PixAI Tsubaki.3 の公式テンプレートの品質ブロックに使用例'),
        ('detailed clothes', '資料A：PixAI公開作品での使用例'), ('detailed background', '資料A：PixAI公開作品での使用例')]],
    'excluded': [{'tag': t, 'layer': l, 'reason': r} for t, l, r in excluded],
    'naiAutoQuality': {
        'url': SRC['nai_qt'][1], 'checkedAt': CHECKED, 'position': 'end',
        'note': 'V3〜V5 は、NovelAI側がプロンプトの末尾に追加する（Anime V2 以前は先頭）。入力欄には見えないがプロンプトの文字数上限には含まれる。',
        'models': {
            'nai_v5': {'light': ['very aesthetic', 'amazing quality', 'no text'], 'standard': ['very aesthetic', 'masterpiece', 'no text']},
            'nai_v45': {'on': ['location', 'very aesthetic', 'masterpiece', 'no text'], 'onCurated': ['location', 'masterpiece', 'no text', '-0.8::feet::', 'rating:general']},
            'nai_v4': {'on': ['no text', 'best quality', 'very aesthetic', 'absurdres'], 'onCurated': ['rating:general', 'amazing quality', 'very aesthetic', 'absurdres']},
            'nai_v3': {'on': ['best quality', 'amazing quality', 'very aesthetic', 'absurdres']},
        },
    },
}
missing = [c for c in recon['qualityCandidates'] + recon['detailCandidatesFromReportB'] if c['status'] != 'included']
assert not missing, missing
json.dump(recon, open(os.path.join(ROOT, 'layer_reconciliation.json'), 'w'), ensure_ascii=False, indent=1)

print('quality', len(quality), Counter(x['Category'] for x in quality))
print('detail', len(detail), '+ shared', len(detail_view), '=', len(detail) + len(detail_view), Counter(x['Category'] for x in detail))
print('detail basic', sum(x['Detail_Basic'] for x in detail) + sum(v['basic'] for v in detail_view))
print('risk', Counter(x['Risk'] for x in detail), 'adds', sum(x['Adds_Elements'] for x in detail))
print('rules', len(rules), Counter(r['type'] for r in rules))
print('source class', Counter(x['Source_Class'] for x in all_new))
