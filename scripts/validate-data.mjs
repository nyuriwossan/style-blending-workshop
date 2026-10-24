// データ辞書の整合性チェック（ビルド前・CIで実行）
// 失敗したらビルドを止める。辞書を更新したらまずこれを通す。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));
const tagsFile = load('style_tags.json');
const naiFile = load('style_tags_nai_official.json');
const recon = load('nai_official_reconciliation.json');
const naiRules = load('relation_rules_nai.json').rules;
const presets = load('style_presets.json').presets;
const originalRules = load('conflict_rules.json').rules;
const rules = [...originalRules, ...naiRules];
const meta = load('app_meta.json');
const modelRules = load('model_output_rules.json');

const errors = [];
const warn = [];
const originalTags = tagsFile.tags;
const tags = [...originalTags, ...naiFile.tags];
const byId = new Map();
const cats = new Set(meta.categories.map((c) => c.key));
const ID_RE = /^(REC|NAI)-[A-Z]{3}-\d{3}$/;
const FORBIDDEN = /[(){}[\]:\\<>\n\r\t]/;
// NovelAI公式表記の例外：末尾の「 (medium)」、V5専用の「meta:」接頭辞だけを許す
const OFFICIAL_PAREN = /^[a-z0-9 \-]+ \(medium\)$/;
const OFFICIAL_META = /^meta:[a-z ]+$/;
const REQUIRED = ['ID', 'Category', 'Subcategory', 'Name_JA', 'Name_EN', 'Prompt', 'Evidence_Level', 'MVP_Core', 'Validation_Status'];

for (const t of tags) {
  for (const k of REQUIRED) if (t[k] === undefined || t[k] === '') errors.push(`${t.ID}: ${k} がない`);
  if (!ID_RE.test(t.ID)) errors.push(`${t.ID}: ID形式が REC-XXX-000 でない`);
  if (byId.has(t.ID)) errors.push(`${t.ID}: ID重複`);
  byId.set(t.ID, t);
  if (!cats.has(t.Category)) errors.push(`${t.ID}: 未知のカテゴリ ${t.Category}`);
  const officialException = t.Official && t.Official.tag === t.Prompt && (OFFICIAL_PAREN.test(t.Prompt) || (OFFICIAL_META.test(t.Prompt) && t.V5_Only));
  if (FORBIDDEN.test(t.Prompt) && !officialException) errors.push(`${t.ID}: Prompt に構文記号を含む「${t.Prompt}」`);
  if (t.ID.startsWith('NAI-')) {
    if (!t.Official?.url || !t.Official?.checkedAt) errors.push(`${t.ID}: 公式タグに出典URL・照合日がない`);
    if (!t.Model_Support) errors.push(`${t.ID}: Model_Support がない`);
    if (!/未実施/.test(t.Validation_Status)) errors.push(`${t.ID}: 画像検証の状態は「未実施」であること（公式掲載と検証は別）`);
    if (t.V5_Only && ['nai_v4', 'nai_v45', 'nai_v3', 'pixai_sdxl'].some((p) => t.Model_Support[p] !== 'unsupported')) errors.push(`${t.ID}: V5専用なのに他モデルが非対応になっていない`);
    if (!t.Description_JA || t.Description_JA.length < 30) errors.push(`${t.ID}: 個別の説明文が短すぎる`);
  }
  if (/adult|bust/i.test(t.Prompt)) errors.push(`${t.ID}: Prompt に PIXAI 禁止語を含む`);
  if (!meta.evidenceLevels[t.Evidence_Level]) errors.push(`${t.ID}: 未知の Evidence_Level ${t.Evidence_Level}`);
  if (/検証済|確認済/.test(t.Validation_Status) && !/未/.test(t.Validation_Status))
    warn.push(`${t.ID}: Validation_Status が検証済みを示している。画像検証の記録があるか確認`);
  if (!meta.subcategories[t.Subcategory]) warn.push(`${t.ID}: サブカテゴリ表示名がない ${t.Subcategory}`);
}
const prompts = new Map();
for (const t of tags) {
  const k = t.Prompt.toLowerCase();
  if (prompts.has(k)) errors.push(`Prompt 重複: ${prompts.get(k)} と ${t.ID}`);
  prompts.set(k, t.ID);
}
for (const t of tags) for (const r of [...t.Conflicts, ...t.Synergies]) if (!byId.has(r)) errors.push(`${t.ID}: 参照先 ${r} がない`);

for (const p of presets) {
  const seen = new Set();
  for (const i of p.items) {
    if (!byId.has(i.tagId)) errors.push(`${p.id}: タグ ${i.tagId} がない`);
    if (!(i.strength >= 0 && i.strength <= modelRules.slider.max)) errors.push(`${p.id}: 強度 ${i.strength} が範囲外`);
    if (seen.has(i.tagId)) errors.push(`${p.id}: タグ重複 ${i.tagId}`);
    seen.add(i.tagId);
  }
}
const pairSeen = new Set();
for (const r of rules) {
  if (!meta.relationTypes[r.type]) errors.push(`${r.id}: 未知の関係型 ${r.type}`);
  if (r.tagIds.length !== 2) errors.push(`${r.id}: tagIds は2件であること`);
  r.tagIds.forEach((id, i) => {
    if (!byId.has(id)) errors.push(`${r.id}: タグ ${id} がない`);
    else if (r.tagPrompts?.[i] && byId.get(id).Prompt !== r.tagPrompts[i]) errors.push(`${r.id}: tagPrompts とタグ ${id} の Prompt が不一致`);
  });
  const key = [...r.tagIds].sort().join('|');
  if (pairSeen.has(key)) errors.push(`${r.id}: 同じ組の重複ルール`);
  pairSeen.add(key);
}

// 既存329件・プリセット・元ルールが欠けていないこと
if (originalTags.length !== 329) errors.push(`元辞書の件数が ${originalTags.length}（329件であること）`);
if (originalRules.length !== 53) errors.push(`元ルールの件数が ${originalRules.length}（53件であること）`);
// 照合結果：追加・一致とされたIDが辞書に実在すること
for (const e of recon.entries) {
  if (e.status === 'exact' && (!byId.has(e.existingId) || byId.get(e.existingId).Prompt.toLowerCase() !== e.officialTag.toLowerCase())) errors.push(`照合：${e.officialTag} の一致先 ${e.existingId} が不正`);
  if (e.status === 'added' && (!byId.has(e.newId) || byId.get(e.newId).Prompt !== e.officialTag)) errors.push(`照合：${e.officialTag} の追加先 ${e.newId} が不正`);
  if (e.status === 'excluded' && !e.reason) errors.push(`照合：${e.officialTag} の除外理由がない`);
}
for (const t of naiFile.tags) if (!recon.entries.some((e) => e.newId === t.ID)) errors.push(`${t.ID}: 照合結果に記載がない`);
const desc = new Map();
for (const t of naiFile.tags) {
  if (desc.has(t.Description_JA)) errors.push(`${t.ID}: 説明文が ${desc.get(t.Description_JA)} と同一（使い回し）`);
  desc.set(t.Description_JA, t.ID);
}

// ── v1.2：品質調合・仕上げディテール ──
const quality = load('quality_tags.json');
const detail = load('detail_tags.json');
const qPresets = load('quality_presets.json');
const dPresets = load('detail_presets.json');
const layerRules = load('layer_relations.json').rules;
const layerTags = [...quality.tags, ...detail.tags];
const layerIds = new Map();
const LAYER_ID = /^(QLT|DTL)-[A-Z]{3}-\d{3}$/;
const allPrompts = new Map(tags.map((t) => [t.Prompt.toLowerCase(), t.ID]));
for (const t of layerTags) {
  if (!LAYER_ID.test(t.ID)) errors.push(`${t.ID}: ID形式が QLT/DTL-XXX-000 でない`);
  if (layerIds.has(t.ID) || byId.has(t.ID)) errors.push(`${t.ID}: ID重複`);
  layerIds.set(t.ID, t);
  const k = t.Prompt.toLowerCase();
  if (allPrompts.has(k)) errors.push(`${t.ID}: 英語プロンプト「${t.Prompt}」が ${allPrompts.get(k)} と重複（1つのIDで管理すること）`);
  allPrompts.set(k, t.ID);
  if (!/^[a-z0-9 \-]+$/.test(t.Prompt)) errors.push(`${t.ID}: Prompt に使えない文字`);
  if (/adult|bust/i.test(`${t.Prompt} ${t.NL_Template ?? ''}`)) errors.push(`${t.ID}: PIXAI 禁止語を含む`);
  if (!/未実施/.test(t.Validation_Status)) errors.push(`${t.ID}: 画像検証は「未実施」であること`);
  if (!t.Evidence?.length) errors.push(`${t.ID}: 根拠がない`);
  if (!quality.sourceClasses[t.Source_Class]) errors.push(`${t.ID}: 未知の出典区分 ${t.Source_Class}`);
  if (t.Layer === 'detail' && !['low', 'medium', 'high'].includes(t.Risk)) errors.push(`${t.ID}: 外見変更リスクがない`);
  if (t.NL_Template && !t.NL_Template.includes('{m}')) errors.push(`${t.ID}: 自然文テンプレートに {m} がない`);
  if (!t.Description_JA || t.Description_JA.length < 30) errors.push(`${t.ID}: 説明文が短すぎる`);
  for (const p of Object.keys(t.Model_Support)) if (!['official', 'example', 'unsupported', 'unverified'].includes(t.Model_Support[p])) errors.push(`${t.ID}: 未知の対応状態 ${p}`);
}
const ld = new Map();
for (const t of layerTags) {
  if (ld.has(t.Description_JA)) errors.push(`${t.ID}: 説明文が ${ld.get(t.Description_JA)} と同一（使い回し）`);
  ld.set(t.Description_JA, t.ID);
}
for (const r of detail.sharedFromQuality) if (!quality.tags.some((t) => t.ID === r.ref && t.Layers.includes('detail'))) errors.push(`仕上げの共有参照 ${r.ref} が不正`);
for (const p of [...qPresets.presets, ...dPresets.presets]) for (const i of p.items) if (!layerIds.has(i.tagId)) errors.push(`${p.id}: タグ ${i.tagId} がない`);
for (const r of layerRules) for (const id of r.tagIds) if (!layerIds.has(id)) errors.push(`${r.id}: タグ ${id} がない`);
for (const id of quality.quickIds) if (!layerIds.has(id)) errors.push(`クイック選択 ${id} がない`);

const mvp = originalTags.filter((t) => t.MVP_Core).length;
const exp = tagsFile.claimedHistoricalAggregates;
if (exp) {
  if (originalTags.length !== exp.tags) warn.push(`タグ件数 ${originalTags.length}（報告値 ${exp.tags}）`);
  if (mvp !== exp.mvp) warn.push(`MVP件数 ${mvp}（報告値 ${exp.mvp}）`);
  if (presets.length !== exp.presets) warn.push(`プリセット件数 ${presets.length}（報告値 ${exp.presets}）`);
  if (originalRules.length !== exp.conflicts) warn.push(`ルール件数 ${originalRules.length}（報告値 ${exp.conflicts}）`);
}

console.log(`tags=${tags.length} (original ${originalTags.length} + NAI official ${naiFile.tags.length}) mvp=${mvp} presets=${presets.length} rules=${rules.length} recon=${recon.entries.length}`);
console.log(`quality=${quality.tags.length} detail=${detail.tags.length}+shared ${detail.sharedFromQuality.length} qPresets=${qPresets.presets.length} dPresets=${dPresets.presets.length} layerRules=${layerRules.length}`);
for (const w of warn) console.warn('WARN', w);
if (errors.length) {
  for (const e of errors) console.error('ERROR', e);
  process.exit(1);
}
console.log('data OK');
