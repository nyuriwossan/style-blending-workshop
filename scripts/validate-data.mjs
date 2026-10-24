// データ辞書の整合性チェック（ビルド前・CIで実行）
// 失敗したらビルドを止める。辞書を更新したらまずこれを通す。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));
const tagsFile = load('style_tags.json');
const presets = load('style_presets.json').presets;
const rules = load('conflict_rules.json').rules;
const meta = load('app_meta.json');
const modelRules = load('model_output_rules.json');

const errors = [];
const warn = [];
const tags = tagsFile.tags;
const byId = new Map();
const cats = new Set(meta.categories.map((c) => c.key));
const ID_RE = /^REC-[A-Z]{3}-\d{3}$/;
const FORBIDDEN = /[(){}[\]:\\<>\n\r\t]/;
const REQUIRED = ['ID', 'Category', 'Subcategory', 'Name_JA', 'Name_EN', 'Prompt', 'Evidence_Level', 'MVP_Core', 'Validation_Status'];

for (const t of tags) {
  for (const k of REQUIRED) if (t[k] === undefined || t[k] === '') errors.push(`${t.ID}: ${k} がない`);
  if (!ID_RE.test(t.ID)) errors.push(`${t.ID}: ID形式が REC-XXX-000 でない`);
  if (byId.has(t.ID)) errors.push(`${t.ID}: ID重複`);
  byId.set(t.ID, t);
  if (!cats.has(t.Category)) errors.push(`${t.ID}: 未知のカテゴリ ${t.Category}`);
  if (FORBIDDEN.test(t.Prompt)) errors.push(`${t.ID}: Prompt に構文記号を含む「${t.Prompt}」`);
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

const mvp = tags.filter((t) => t.MVP_Core).length;
const exp = tagsFile.claimedHistoricalAggregates;
if (exp) {
  if (tags.length !== exp.tags) warn.push(`タグ件数 ${tags.length}（報告値 ${exp.tags}）`);
  if (mvp !== exp.mvp) warn.push(`MVP件数 ${mvp}（報告値 ${exp.mvp}）`);
  if (presets.length !== exp.presets) warn.push(`プリセット件数 ${presets.length}（報告値 ${exp.presets}）`);
  if (rules.length !== exp.conflicts) warn.push(`ルール件数 ${rules.length}（報告値 ${exp.conflicts}）`);
}

console.log(`tags=${tags.length} mvp=${mvp} presets=${presets.length} rules=${rules.length}`);
for (const w of warn) console.warn('WARN', w);
if (errors.length) {
  for (const e of errors) console.error('ERROR', e);
  process.exit(1);
}
console.log('data OK');
