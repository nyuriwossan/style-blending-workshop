// data/nai_official_reconciliation.json から、人が読む照合一覧（docs/nai-official-reconciliation.md）を作る
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const j = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const recon = j('nai_official_reconciliation.json');
const all = [...j('style_tags.json').tags, ...j('style_tags_nai_official.json').tags];
const byId = new Map(all.map((t) => [t.ID, t]));
const cat = Object.fromEntries(j('app_meta.json').categories.map((c) => [c.key, c.label]));
const label = { exact: '完全一致（既存）', added: '追加', special_ui: '専用UI', excluded: '収録しない', duplicate_listing: '重複掲載' };
const page = (u) => (u.includes('tutorial-artstyles') ? 'Unique Artstyles' : u.includes('/tags') ? 'Tagging' : 'Strengthening & Weakening');
const counts = recon.entries.reduce((a, e) => ((a[e.status] = (a[e.status] ?? 0) + 1), a), {});
let md = `# NovelAI公式タグ照合一覧（v1.1）\n\n照合日：${recon.checkedAt}\n\n${recon.note}\n\n`;
md += `| 区分 | 件数 |\n|---|---:|\n${Object.entries(label).map(([k, v]) => `| ${v} | ${counts[k] ?? 0} |`).join('\n')}\n| 合計 | ${recon.entries.length} |\n\n`;
md += `- 辞書の総件数：${all.length}（元の再構築版 329 ＋ 公式追加 ${all.length - 329}）\n- 「完全一致」は英語の文字列が一致するもの（大小文字は区別しない）。「追加」の「似た既存タグ」は意味が近い別表現で、統合していない。\n\n`;
md += `資料：\n${recon.sources.map((s) => `- [${s.title}](${s.url})`).join('\n')}\n\n`;
for (const p of ['Unique Artstyles', 'Tagging', 'Strengthening & Weakening']) {
  const rows = recon.entries.filter((e) => page(e.page) === p);
  md += `## ${p}\n\n| 公式タグ | 節 | 結果 | 辞書のID・カテゴリ | 似た既存タグ／理由 |\n|---|---|---|---|---|\n`;
  for (const e of rows) {
    const id = e.existingId ?? e.newId;
    const t = id ? byId.get(id) : null;
    const where = t ? `${id}（${cat[t.Category]}）` : '—';
    const extra = e.status === 'added' ? (e.similarExisting ?? []).map((x) => `${byId.get(x)?.Prompt}`).join(', ') || '—' : e.reason ?? e.note ?? '—';
    md += `| \`${e.officialTag}\` | ${e.section} | ${label[e.status]}${t?.V5_Only ? '（V5専用）' : ''} | ${where} | ${extra} |\n`;
  }
  md += '\n';
}
writeFileSync(join(root, 'docs', 'nai-official-reconciliation.md'), md);
console.log('written', recon.entries.length);
