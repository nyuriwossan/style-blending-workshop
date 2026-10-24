// 品質調合・仕上げディテールの収録一覧と根拠（docs/quality-detail-tags.md）を作る
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const q = j('quality_tags.json');
const d = j('detail_tags.json');
const recon = j('layer_reconciliation.json');
const sup = (t) => {
  const s = t.Model_Support;
  const pick = (ks) => ks.map((k) => ({ official: '公式', example: '例', unsupported: '×', unverified: '—' }[s[k]])).join('/');
  return `NAI ${pick(['nai_v3', 'nai_v4', 'nai_v45', 'nai_v5'])}・PIXAI ${pick(['pixai_sdxl', 'pixai_tsubaki2', 'pixai_tsubaki3'])}`;
};
const ev = (t) => t.Evidence.map((e) => (e.url ? `[${e.source}](${e.url})` : e.source) + `：${e.note}`).join('<br>');
let md = `# 品質調合・仕上げディテール 収録一覧（v1.2）\n\n照合日：${q.checkedAt}\n\n`;
md += `- 品質調合：${q.tags.length}件（うち3件は仕上げディテールと共有）\n- 仕上げディテール：専用${d.tags.length}件＋共有${d.sharedFromQuality.length}件＝${d.tags.length + d.sharedFromQuality.length}件（基本表示${d.tags.filter((t) => t.Detail_Basic).length + d.sharedFromQuality.filter((x) => x.basic).length}件）\n`;
md += `- 画像生成による効果検証：すべて未実施。公式資料への掲載・使用例とは別の情報として扱う。\n- 対応の記号：公式＝公式資料に掲載、例＝公式の作例・テンプレートに使用例、×＝公式に別の版専用と記載（出力しない）、—＝記載なし・未検証（出力はする）。並びは NAI V3/V4/V4.5/V5・PIXAI SDXL/Tsubaki.2/Tsubaki.3。\n\n`;
md += `## 出典区分\n\n${Object.entries(q.sourceClasses).map(([k, v]) => `- \`${k}\`：${v}`).join('\n')}\n\n`;
md += `## 品質調合\n\n| タグ | 日本語名 | 分類 | 出典区分 | 対応 | 根拠 |\n|---|---|---|---|---|---|\n`;
const qcat = Object.fromEntries(q.categories.map((c) => [c.key, c.label]));
for (const t of q.tags) md += `| \`${t.Prompt}\`${t.Layers.includes('detail') ? '（仕上げと共有）' : ''} | ${t.Name_JA} | ${qcat[t.Category]} | ${t.Source_Class_Label} | ${sup(t)} | ${ev(t)} |\n`;
md += `\n## 仕上げディテール\n\n| タグ | 日本語名 | 部位 | 種類 | 外見変更リスク（暫定） | 要素追加 | 基本 | 出典区分 | 根拠 |\n|---|---|---|---|---|---|---|---|---|\n`;
const dcat = Object.fromEntries(d.categories.map((c) => [c.key, c.label]));
const risk = { low: '低', medium: '中', high: '高' };
for (const t of d.tags) md += `| \`${t.Prompt}\` | ${t.Name_JA} | ${dcat[t.Category]} | ${d.detailTypes[t.Detail_Type]} | ${risk[t.Risk]}：${t.Risk_Note} | ${t.Adds_Elements ? 'あり' : ''} | ${t.Detail_Basic ? '○' : ''} | ${t.Source_Class_Label} | ${ev(t)} |\n`;
for (const s of d.sharedFromQuality) {
  const t = q.tags.find((x) => x.ID === s.ref);
  md += `| \`${t.Prompt}\`（品質と共有・同じID） | ${t.Name_JA} | ${dcat[s.detailCategory]} | 描き込み | — |  | ${s.basic ? '○' : ''} | ${t.Source_Class_Label} | 品質調合の行を参照 |\n`;
}
md += `\n## NovelAI の自動品質タグ（${recon.naiAutoQuality.checkedAt} 照合）\n\n${recon.naiAutoQuality.note}\n\n| モデル | 設定 | 追加されるタグ |\n|---|---|---|\n`;
for (const [m, sets] of Object.entries(recon.naiAutoQuality.models)) for (const [k, v] of Object.entries(sets)) md += `| ${m} | ${k} | ${v.join(', ')} |\n`;
md += `\n出典：[${recon.naiAutoQuality.url}](${recon.naiAutoQuality.url})\n\n## 依頼書・資料Bの候補の採否\n\n- 依頼書の品質候補 ${recon.qualityCandidates.length} 件：すべて収録\n- 資料Bの仕上げ候補 ${recon.detailCandidatesFromReportB.length} 件：すべて収録\n\n### 追加したもの\n\n${recon.additions.map((a) => `- \`${a.tag}\`（${a.id}）：${a.reason}`).join('\n')}\n\n### 収録しなかったもの\n\n| 候補 | 層 | 理由 |\n|---|---|---|\n${recon.excluded.map((e) => `| ${e.tag} | ${e.layer === 'quality' ? '品質' : '仕上げ'} | ${e.reason} |`).join('\n')}\n`;
writeFileSync(join(root, 'docs', 'quality-detail-tags.md'), md);
console.log('written');
