// E2E・回帰テスト：ビルド済み dist を GitHub Pages と同じサブパスで配信して、iPhone相当の画面で操作する
// 実行：npm run build && npm run e2e
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require('playwright');
} catch {
  pw = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
}
const { chromium, devices } = pw;

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const out = join(here, 'out');
const BASE = '/style-blending-workshop/';
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist がありません。先に npm run build を実行してください');
  process.exit(1);
}
await mkdir(out, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!url.startsWith(BASE)) {
    res.writeHead(404).end('not under base path');
    return;
  }
  let rel = url.slice(BASE.length) || 'index.html';
  try {
    const body = await readFile(join(dist, rel));
    res.writeHead(200, { 'content-type': types[extname(rel)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('nf');
  }
});
await new Promise((r) => server.listen(4319, r));
const ORIGIN = 'http://localhost:4319';

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push([true, name]);
    console.log('  ✓', name);
  } catch (e) {
    results.push([false, name, e]);
    console.log('  ✗', name, '\n    ', String(e?.message || e).split('\n')[0]);
  }
}
function assert(c, msg) {
  if (!c) throw new Error(msg);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const failed404 = [];
page.on('response', (r) => r.status() >= 400 && failed404.push(r.url()));

const tab = (name) => page.getByRole('navigation', { name: '画面' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
const openCat = async (label) => {
  const b = page.getByRole('button', { name: new RegExp(`^${label}`) });
  if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click();
};
const tagToggle = (ja) => page.locator('li.tag', { has: page.locator('.tag-ja', { hasText: new RegExp(`^${ja}`) }) }).first();
const preview = async () => {
  await tab('出力');
  const t = (await page.locator('pre.preview').innerText()).trim();
  await tab('調合');
  return t;
};
const setProfile = (id) => page.locator('.topbar select').selectOption(id);

console.log('E2E（iPhone 13 / サブパス ' + BASE + '）');

await test('12. GitHub Pages のサブパスで読み込める（404なし・JSエラーなし）', async () => {
  await page.goto(ORIGIN + BASE);
  await page.getByRole('heading', { name: /画風調合工房/ }).waitFor();
  assert(failed404.length === 0, '404: ' + failed404.join(', '));
  assert(errors.length === 0, errors.join('\n'));
});

await test('1/2. 基本表示は72件、詳細表示は329件', async () => {
  // すべて開いて数える
  for (const c of ['基本画風', '描線・線画', '塗り・彩色', '光・ライティング', '陰影・コントラスト', '色彩・パレット', '画材・質感', '光学効果', '大気感・印刷表現']) await openCat(c);
  const basic = await page.locator('li.tag').count();
  assert(basic === 72, `基本 ${basic}`);
  await page.getByRole('radio', { name: /詳細/ }).click();
  const detail = await page.locator('li.tag').count();
  assert(detail === 329, `詳細 ${detail}`);
  await page.getByRole('radio', { name: /基本/ }).click();
});

await test('3/4. 同じカテゴリから複数選択し、スライダーを個別に操作できる', async () => {
  await setProfile('nai_v45');
  for (const ja of ['細い線画', '繊細な描線', 'ラフな線画', '色付き輪郭線']) await tagToggle(ja).locator('.tag-toggle').click();
  const set = async (ja, v) => {
    const r = tagToggle(ja).locator('input[type=range]');
    await r.fill(String(v));
  };
  await set('細い線画', 1.3);
  await set('ラフな線画', 0.8);
  await tagToggle('色付き輪郭線').getByRole('button', { name: /強める/ }).click(); // 1.0 → 1.1
  await tagToggle('色付き輪郭線').getByRole('button', { name: /強める/ }).click(); // → 1.2
  const p = await preview();
  assert(p === '1.3::thin lineart ::, delicate linework, 0.8::loose lineart ::, 1.2::colored outlines ::', p);
});

await test('11. 類似タグを勝手に統合しない（細い線画＋繊細な描線が両方残る）', async () => {
  const p = await preview();
  assert(p.includes('thin lineart') && p.includes('delicate linework'), p);
});

await test('5. OFFのタグは出力されず、値は保持される', async () => {
  await tagToggle('細い線画').locator('.tag-toggle').click();
  let p = await preview();
  assert(!p.includes('thin lineart'), p);
  assert(await tagToggle('細い線画').getByText(/1\.3 を保持中/).isVisible(), '保持表示なし');
  await tagToggle('細い線画').locator('.tag-toggle').click();
  p = await preview();
  assert(p.startsWith('1.3::thin lineart ::'), p);
});

await test('6/14. モデル切替で構文が変わる', async () => {
  const expect = {
    pixai_sdxl: '(thin lineart:1.3), delicate linework, (loose lineart:0.8), (colored outlines:1.2)',
    pixai_tsubaki2: 'pronounced thin lineart, delicate linework, gentle loose lineart, pronounced colored outlines',
    pixai_tsubaki3: 'pronounced thin lineart, delicate linework, gentle loose lineart, pronounced colored outlines',
    nai_v4: '1.3::thin lineart ::, delicate linework, 0.8::loose lineart ::, 1.2::colored outlines ::',
    nai_v5: '1.3::thin lineart ::, delicate linework, 0.8::loose lineart ::, 1.2::colored outlines ::',
    nai_v3: '{{{{{thin lineart}}}}}, delicate linework, [[[[[loose lineart]]]]], {{{{colored outlines}}}}',
  };
  for (const [id, want] of Object.entries(expect)) {
    await setProfile(id);
    const p = await preview();
    assert(p === want, `${id}: ${p}`);
  }
  await setProfile('nai_v45');
});

await test('7. 競合警告：排他的は強い警告、選択は残す。OFFボタンはユーザー操作のみ', async () => {
  await tagToggle('線画なし').locator('.tag-toggle').click();
  const notice = page.locator('.notice-strong').first();
  await notice.waitFor();
  const text = await notice.innerText();
  assert(/排他的/.test(text) && /線画なし/.test(text), text);
  const p = await preview();
  assert(p.includes('no lineart') && p.includes('thin lineart'), '選択が消えた: ' + p);
  await notice.getByRole('button', { name: /「線画なし」をOFF/ }).click();
  const p2 = await preview();
  assert(!p2.includes('no lineart'), p2);
  assert((await page.locator('.notice-strong').count()) === 0, '警告が残る');
});

await test('相性候補（相乗）の提案から追加できる', async () => {
  await openCat('光・ライティング');
  await tagToggle('逆光').locator('.tag-toggle').click();
  const head = page.locator('.notices-head');
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  const s = page.locator('.notice-suggest', { hasText: 'リムライト' });
  await s.getByRole('button', { name: /追加/ }).click();
  const p = await preview();
  assert(p.includes('rim lighting'), p);
});

await test('グループ：新規グループ・重複タグの整理（加算しない）', async () => {
  page.once('dialog', () => {});
  await page.getByRole('button', { name: '＋ グループ' }).click();
  await page.locator('.dlg input').fill('繊細な茶色の線画');
  await page.locator('.dlg').getByRole('button', { name: '作成' }).click();
  await openCat('描線・線画');
  await tagToggle('細い線画').locator('.tag-toggle').click(); // 新グループに 1.0
  await tagToggle('細い線画').locator('input[type=range]').fill('0.6');
  assert(await tagToggle('細い線画').getByText(/他のグループにも/).isVisible(), '他グループ表示なし');
  let p = await preview();
  assert((p.match(/thin lineart/g) || []).length === 1, '重複出力: ' + p);
  assert(p.includes('1.3::thin lineart ::'), '上のグループ優先でない: ' + p);
  await tab('出力');
  await page.locator('details.opts', { hasText: '出力の設定' }).locator('summary').click();
  await page.locator('details.opts select').selectOption('min');
  p = (await page.locator('pre.preview').innerText()).trim();
  assert(p.includes('0.6::thin lineart ::'), '最小値規則: ' + p);
  await page.locator('details.opts select').selectOption('first');
  await tab('調合');
});

await test('グループ一括調整は個別の値を変える', async () => {
  await page.locator('.chip-on').click(); // メニューを開く
  await page.locator('.dlg').getByRole('button', { name: '＋0.1 一括' }).click();
  const v = await tagToggle('細い線画').locator('output').innerText();
  assert(v === '0.7', v);
});

await test('8. 36プリセットを読み込める（追加時の重複確認ダイアログ）', async () => {
  await tab('プリセット');
  const n = await page.locator('.preset').count();
  assert(n === 36, `プリセット ${n}`);
  await page.getByRole('button', { name: /精緻漫画線画|王道アニメ塗り/ }).first().click();
  await page.getByRole('button', { name: '編集中のグループに追加' }).click();
  // 重複があれば値の選択が出る
  const dlg = page.locator('.dlg');
  if (await dlg.isVisible().catch(() => false)) {
    assert(/足し算しません/.test(await dlg.innerText()), '重複の説明なし');
    await dlg.getByRole('button', { name: '現在の値を残す' }).click();
  }
  await page.locator('.tray-strip').waitFor();
});

let savedPrompt = '';
await test('9. レシピ保存 → 再読み込み後も残る → 復元で同じ出力', async () => {
  savedPrompt = await preview();
  await tab('保存棚');
  await page.getByRole('button', { name: '新しいレシピとして保存' }).click();
  await page.locator('.dlg input').fill('E2Eレシピ');
  await page.locator('.dlg').getByRole('button', { name: '保存' }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await tab('出力');
  await page.getByRole('button', { name: '調合をリセット' }).click();
  await page.locator('.dlg').getByRole('button', { name: 'リセット' }).click();
  assert((await page.locator('pre.preview').innerText()).includes('タグを選ぶと'), 'リセットされない');
  await tab('保存棚');
  await page.locator('.shelf-list li', { hasText: 'E2Eレシピ' }).getByRole('button', { name: '読み込んで編集' }).click();
  const p = await preview();
  assert(p === savedPrompt, `復元不一致\n${p}\n${savedPrompt}`);
});

await test('レシピの名前変更・複製・削除', async () => {
  await tab('保存棚');
  const row = page.locator('.shelf-list li', { hasText: 'E2Eレシピ' }).first();
  await row.getByRole('button', { name: '複製' }).click();
  assert(await page.locator('.shelf-list li', { hasText: 'E2Eレシピのコピー' }).isVisible(), '複製なし');
  const copyRow = page.locator('.shelf-list li', { hasText: 'E2Eレシピのコピー' });
  await copyRow.getByRole('button', { name: '名前変更' }).click();
  await page.locator('.dlg input').fill('別版');
  await page.locator('.dlg').getByRole('button', { name: '決定' }).click();
  const r2 = page.locator('.shelf-list li', { hasText: '別版' });
  await r2.getByRole('button', { name: '削除' }).click();
  await page.locator('.dlg').getByRole('button', { name: '削除' }).click();
  assert((await page.locator('.shelf-list li', { hasText: '別版' }).count()) === 0, '削除されない');
});

await test('10. JSONエクスポート → 別端末相当（新しい環境）でインポート → 同じ出力', async () => {
  await tab('保存棚');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '全体を書き出す（JSON）' }).click()]);
  const file = join(out, 'backup.json');
  await dl.saveAs(file);
  const json = JSON.parse(await readFile(file, 'utf8'));
  assert(json.app === 'style-blending-workshop' && json.schemaVersion === 1 && json.kind === 'backup', 'ヘッダ不正');
  assert(json.recipes.some((r) => r.name === 'E2Eレシピ'), 'レシピがない');

  const ctx2 = await browser.newContext({ ...devices['iPhone 13'] });
  const p2 = await ctx2.newPage();
  await p2.goto(ORIGIN + BASE);
  await p2.getByRole('button', { name: /^保存棚/ }).click();
  await p2.locator('input[type=file]').first().setInputFiles(file);
  await p2.locator('.import-report', { hasText: /レシピ 1 件/ }).waitFor();
  await p2.locator('.shelf-list li', { hasText: 'E2Eレシピ' }).getByRole('button', { name: '読み込んで編集' }).click();
  await p2.getByRole('navigation', { name: '画面' }).getByRole('button', { name: /^出力/ }).click();
  const p = (await p2.locator('pre.preview').innerText()).trim();
  assert(p === savedPrompt, `インポート後不一致\n${p}`);
  await ctx2.close();
});

await test('不明なタグIDを含むレシピは削除せず警告', async () => {
  const f = join(out, 'unknown.json');
  await writeFile(f, JSON.stringify({ app: 'style-blending-workshop', kind: 'recipe', schemaVersion: 1, recipe: { name: '不明入り', groups: [{ name: 'g', items: [{ tagId: 'REC-ZZZ-999', strength: 1 }, { tagId: 'REC-OPT-001', strength: 1.2 }] }] } }));
  await tab('保存棚');
  await page.locator('input[type=file]').first().setInputFiles(f);
  await page.locator('.import-report', { hasText: 'REC-ZZZ-999' }).waitFor();
  await page.locator('.shelf-list li', { hasText: '不明入り' }).getByRole('button', { name: '読み込んで編集' }).click();
  await page.locator('.dlg').getByRole('button', { name: '読み込む' }).click().catch(() => {});
  await page.locator('.notice', { hasText: 'REC-ZZZ-999' }).first().waitFor();
  const p = await preview();
  assert(p.includes('bloom') && !p.includes('ZZZ'), p);
});

await test('自作タグ（delicate thin lineart）を追加して出力できる', async () => {
  await tab('保存棚');
  const form = page.locator('.form');
  await form.locator('select').selectOption('linework');
  await form.getByLabel(/英語タグ/).fill('delicate thin lineart');
  await form.getByLabel(/日本語名/).fill('繊細な細い線画');
  await form.getByRole('button', { name: '追加する' }).click();
  await form.getByLabel(/英語タグ/).fill('(bad:1.2)');
  await form.getByRole('button', { name: '追加する' }).click();
  assert(await form.getByRole('alert').isVisible(), '不正入力が通った');
  await form.getByLabel(/英語タグ/).fill('');
  await tab('調合');
  await openCat('描線・線画');
  await tagToggle('繊細な細い線画').locator('.tag-toggle').click();
  await tagToggle('繊細な細い線画').locator('input[type=range]').fill('1.3');
  await setProfile('nai_v45');
  const p = await preview();
  assert(p.includes('1.3::delicate thin lineart ::'), p);
});

await test('13. 「検証済み」「確認済み」と誤表示しない', async () => {
  const bodies = [];
  for (const t of ['調合', 'プリセット', '保存棚', '出力']) {
    await tab(t);
    bodies.push(await page.locator('body').innerText());
  }
  await tab('調合');
  await page.locator('.tag-info').first().click();
  bodies.push(await page.locator('body').innerText());
  const all = bodies.join('\n');
  const bad = all.match(/.{0,8}(検証済|確認済|verified).{0,8}/g)?.filter((s) => !/未/.test(s)) ?? [];
  assert(bad.length === 0, bad.join(' / '));
  assert(/画像での検証/.test(all) && /未実施/.test(all), '未検証表示がない');
});

await test('元に戻す（undo）で調合が戻る', async () => {
  const before = await preview();
  await tab('出力');
  await page.getByRole('button', { name: '調合をリセット' }).click();
  await page.locator('.dlg').getByRole('button', { name: 'リセット' }).click();
  await page.getByRole('button', { name: '元に戻す' }).click();
  const after = await preview();
  assert(before === after, 'undo失敗');
});

await test('Tsubaki/PIXAI出力に adult・bust・負のプロンプトが出ない', async () => {
  await setProfile('pixai_tsubaki3');
  const p = await preview();
  assert(!/adult|bust/i.test(p), p);
  assert(!/[():{}[\]]|\d/.test(p), '数値・括弧が出た: ' + p);
});

await test('画面確認用スクリーンショット', async () => {
  await setProfile('pixai_sdxl');
  await tab('調合');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(out, 'mobile-mix.png') });
  await tab('出力');
  await page.screenshot({ path: join(out, 'mobile-output.png') });
  await tab('プリセット');
  await page.getByRole('button', { name: /淡彩水彩/ }).click().catch(() => {});
  await page.screenshot({ path: join(out, 'mobile-presets.png') });
  const desk = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const d = await desk.newPage();
  await d.goto(ORIGIN + BASE);
  await d.evaluate((s) => localStorage.setItem('sbw.state.v1', s), await page.evaluate(() => localStorage.getItem('sbw.state.v1')));
  await d.reload();
  await d.screenshot({ path: join(out, 'desktop.png') });
  const dark = await browser.newContext({ ...devices['iPhone 13'], colorScheme: 'dark' });
  const dk = await dark.newPage();
  await dk.goto(ORIGIN + BASE);
  await dk.evaluate((s) => localStorage.setItem('sbw.state.v1', s), await page.evaluate(() => localStorage.getItem('sbw.state.v1')));
  await dk.reload();
  await dk.screenshot({ path: join(out, 'mobile-dark.png') });
  await desk.close();
  await dark.close();
});

await test('実行中のJSエラーなし', async () => {
  assert(errors.length === 0, errors.join('\n'));
});

await browser.close();
server.close();
const ng = results.filter((r) => !r[0]);
console.log(`\n${results.length - ng.length}/${results.length} passed`);
process.exit(ng.length ? 1 : 0);
