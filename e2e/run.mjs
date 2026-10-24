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

await test('1/2. 基本表示は86件（元のおすすめ72＋v1.1追加14）、詳細表示は398件', async () => {
  // すべて開いて数える
  for (const c of ['基本画風', '描線・線画', '塗り・彩色', '光・ライティング', '陰影・コントラスト', '色彩・パレット', '画材・質感', '光学効果', '大気感・印刷表現']) await openCat(c);
  const basic = await page.locator('li.tag').count();
  assert(basic === 86, `基本 ${basic}`);
  await page.getByRole('radio', { name: /詳細/ }).click();
  const detail = await page.locator('li.tag').count();
  assert(detail === 398, `詳細 ${detail}`);
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
  assert(json.app === 'style-blending-workshop' && json.schemaVersion === 3 && json.kind === 'backup', 'ヘッダ不正');
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
  await page.locator('.topbar').getByRole('button', { name: '元に戻す' }).click();
  const after = await preview();
  assert(before === after, 'undo失敗');
});

// ───────── v1.1 ─────────
const lsGet = () => page.evaluate(() => localStorage.getItem('sbw.state.v1'));
const shelfCounts = async () => {
  await tab('保存棚');
  const recipes = await page.locator('.shelf-sec').nth(0).locator('.shelf-list > li').count();
  const groups = await page.locator('.shelf-sec').nth(1).locator('.shelf-list > li').count();
  const custom = await page.locator('.shelf-sec').nth(2).locator('.shelf-list > li').count();
  await tab('調合');
  return { recipes, groups, custom };
};

await test('13/18. 調合画面の上部にリセットボタンがあり、iPhone幅でスクロールせずに見える', async () => {
  await tab('調合');
  await page.evaluate(() => window.scrollTo(0, 0));
  const btn = page.locator('.mix-head').getByRole('button', { name: /調合をリセット/ });
  assert(await btn.isVisible(), '見えない');
  const box = await btn.boundingBox();
  const vp = page.viewportSize();
  assert(box && box.y >= 0 && box.y + box.height <= vp.height * 0.45, `位置 ${JSON.stringify(box)}`);
  assert(box.height >= 34, 'タップ領域が小さい');
  await page.screenshot({ path: join(out, 'v11-mix-top.png') });
});

await test('14. キャンセルでは何も変わらない', async () => {
  const before = await preview();
  const ls = await lsGet();
  await page.locator('.mix-head').getByRole('button', { name: /調合をリセット/ }).click();
  const dlg = page.locator('.dlg');
  assert((await dlg.locator('h2').innerText()) === '現在の調合を空にしますか？', '文言');
  assert(/保存済みのレシピと自作タグは削除されません/.test(await dlg.innerText()), '補足文');
  await dlg.getByRole('button', { name: 'キャンセル' }).click();
  await page.waitForTimeout(400);
  assert((await preview()) === before, '出力が変わった');
  assert((await lsGet()) === ls, '保存データが変わった');
});

await test('15/16/17. リセットは調合だけを空にし、レシピ・グループ棚・自作タグ・出力先は残る。通知から元に戻せる', async () => {
  await setProfile('nai_v45');
  const before = await preview();
  const counts = await shelfCounts();
  await page.locator('.mix-head').getByRole('button', { name: /調合をリセット/ }).click();
  await page.locator('.dlg').getByRole('button', { name: 'リセットする' }).click();
  const toast = page.locator('.toast', { hasText: '調合を空にしました。元に戻すことができます。' }).last();
  await toast.waitFor();
  assert((await page.locator('.mix-summary b').allInnerTexts()).every((t) => t === '0'), 'タグが残っている');
  assert((await page.locator('.topbar select').inputValue()) === 'nai_v45', '出力先が変わった');
  const after = await shelfCounts();
  assert(JSON.stringify(after) === JSON.stringify(counts), `保存棚が変わった ${JSON.stringify(counts)} → ${JSON.stringify(after)}`);
  await toast.getByRole('button', { name: '元に戻す' }).click();
  assert((await preview()) === before, '通知の元に戻すで復元されない');
});

await test('7/9/11. V5で複雑度と年タグ。V5以外では非対応の項目を出さず保持し、V5に戻すと復元。再読み込み後も残る', async () => {
  await setProfile('nai_v5');
  await tab('調合');
  const head = page.locator('.nai-head');
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
  await page.getByRole('radiogroup', { name: '複雑度' }).getByRole('radio', { name: '高', exact: true }).click();
  await page.getByLabel('追加する西暦').fill('2024');
  await page.getByRole('button', { name: '年を追加' }).click();
  await page.getByLabel('追加する西暦').fill('2025');
  await page.getByRole('button', { name: '年を追加' }).click();
  for (const y of ['2024', '2025']) await page.locator('.year-list li', { hasText: `year ${y}` }).locator('input[type=range]').fill('1.5');
  await page.getByLabel('追加する西暦').fill('99');
  await page.getByRole('button', { name: '年を追加' }).click();
  assert(await page.locator('.nai-special [role=alert]').isVisible(), '入力検査なし');
  // V5専用タグも1つ
  await page.locator('input.search').fill('depthness');
  await tagToggle('陰影の奥行き').locator('.tag-toggle').click();
  await page.locator('input.search').fill('');
  let p = await preview();
  assert(p.includes('depthness') && p.endsWith('1.5::year 2024 ::, 1.5::year 2025 ::, high complexity'), 'V5: ' + p);
  assert((p.match(/complexity/g) || []).length === 1, '複雑度が複数');
  // 中に変更 → 1つだけ
  await page.getByRole('radiogroup', { name: '複雑度' }).getByRole('radio', { name: '中', exact: true }).click();
  p = await preview();
  assert(p.endsWith('medium complexity') && !p.includes('high complexity'), '変更: ' + p);
  await setProfile('nai_v45');
  p = await preview();
  assert(!p.includes('complexity') && !p.includes('depthness'), 'V4.5に出た: ' + p);
  assert(p.includes('1.5::year 2024 ::'), '年タグはV4.5でも出る: ' + p);
  assert(await page.locator('.pill', { hasText: '非対応' }).isVisible(), '非対応の表示がない');
  await setProfile('pixai_sdxl');
  p = await preview();
  assert(!/complexity|depthness|year/.test(p), 'PIXAIに出た: ' + p);
  await page.waitForTimeout(500);
  await page.reload();
  await setProfile('nai_v5');
  p = await preview();
  assert(p.includes('depthness') && p.includes('1.5::year 2025 ::') && p.endsWith('medium complexity'), '復元されない: ' + p);
  // 解除
  await tab('調合');
  const h2 = page.locator('.nai-head');
  if ((await h2.getAttribute('aria-expanded')) !== 'true') await h2.click();
  await page.getByRole('radiogroup', { name: '複雑度' }).getByRole('radio', { name: '指定なし', exact: true }).click();
  p = await preview();
  assert(!p.includes('complexity'), '解除できない: ' + p);
});

await test('19. 出力画面のリセットも同じ処理（年タグ・複雑度も空、元に戻せる）', async () => {
  const before = await preview();
  await tab('出力');
  await page.locator('.output').getByRole('button', { name: '調合をリセット' }).click();
  assert((await page.locator('.dlg h2').innerText()) === '現在の調合を空にしますか？', '文言が違う');
  await page.locator('.dlg').getByRole('button', { name: 'リセットする' }).click();
  assert((await page.locator('pre.preview').innerText()).includes('タグを選ぶと'), '空にならない');
  await page.locator('.toast').last().getByRole('button', { name: '元に戻す' }).click();
  assert((await preview()) === before, '元に戻らない');
});

await test('NAI公式掲載のみの絞り込み・公式バッジ・別名検索', async () => {
  await tab('調合');
  await page.getByRole('radio', { name: /詳細/ }).click();
  await page.getByRole('button', { name: /NAI公式掲載のみ/ }).click();
  for (const c of ['基本画風', '描線・線画', '塗り・彩色', '光・ライティング', '陰影・コントラスト', '色彩・パレット', '画材・質感', '光学効果', '大気感・印刷表現']) await openCat(c);
  const n = await page.locator('li.tag').count();
  assert(n === 95, `公式 ${n}`);
  const badges = await page.locator('li.tag .badge-official').count();
  assert(badges === 95, `バッジ ${badges}`);
  await page.getByRole('button', { name: /NAI公式掲載のみ/ }).click();
  await page.getByRole('radio', { name: /基本/ }).click();
  await page.locator('input.search').fill('blender');
  assert((await page.locator('li.tag').count()) === 2, '別名検索');
  await page.locator('input.search').fill('');
  // ligne claire は基本表示に入っている
  await openCat('基本画風');
  assert(await tagToggle('リーニュ・クレール').isVisible(), 'ligne claire が基本表示にない');
  // 公式掲載と画像検証が分けて表示される
  await tagToggle('リーニュ・クレール').locator('.tag-info').click();
  const d = await tagToggle('リーニュ・クレール').locator('.tag-detail').innerText();
  assert(/公式掲載/.test(d) && /照合/.test(d) && /画像での検証\s*未実施/.test(d), d);
  await tagToggle('リーニュ・クレール').locator('.tag-info').click();
});

await test('20. v1.0 の保存データ（端末内）をそのまま開ける・同じ出力になる', async () => {
  const fx = (f) => readFile(join(here, '..', 'tests', 'fixtures', f), 'utf8');
  const ls = await fx('v1.0-localstorage.json');
  const exp = JSON.parse(await fx('v1.0-expected.json'));
  const c = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(ORIGIN + BASE);
  await p.evaluate((s) => localStorage.setItem('sbw.state.v1', s), JSON.stringify(JSON.parse(ls)));
  await p.reload();
  await p.getByRole('navigation', { name: '画面' }).getByRole('button', { name: /^出力/ }).click();
  const got = (await p.locator('pre.preview').innerText()).trim();
  assert(got === exp.prompt, `v1.0と出力が違う\n${got}\n${exp.prompt}`);
  await p.getByRole('navigation', { name: '画面' }).getByRole('button', { name: /^保存棚/ }).click();
  assert(await p.locator('.shelf-list li', { hasText: 'v1.0のレシピ' }).isVisible(), 'レシピがない');
  assert(await p.locator('.shelf-list li', { hasText: 'v1.0の線画グループ' }).isVisible(), 'グループがない');
  assert((await p.locator('.shelf-sec').nth(2).locator('.shelf-list > li').count()) === 2, '自作タグが減った');
  await p.waitForTimeout(400);
  const saved = JSON.parse(await p.evaluate(() => localStorage.getItem('sbw.state.v1')));
  assert(saved.schemaVersion === 3 && saved.customTags.length === 2, '移行後の保存が不正');
  assert(errs.length === 0, errs.join('\n'));
  await c.close();
});

// ───────── v1.2：品質調合・仕上げディテール ─────────
const fresh = async () => {
  const c = await browser.newContext({ ...devices['iPhone 13'] });
  await c.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(ORIGIN + BASE);
  const nav = (n) => p.getByRole('navigation', { name: '画面' }).getByRole('button', { name: new RegExp(`^${n}`) }).click();
  const prev = async () => {
    await nav('出力');
    const t = (await p.locator('pre.preview').innerText()).trim();
    await nav('調合');
    return t;
  };
  const drow = (ja) => p.locator('.layer-detail li.tag', { has: p.locator('.tag-ja', { hasText: new RegExp(`^${ja}`) }) }).first();
  const qrow = (ja) => p.locator('.layer-quality li.tag', { has: p.locator('.tag-ja', { hasText: new RegExp(`^${ja}`) }) }).first();
  return { c, p, errs, nav, prev, drow, qrow };
};
let L; // v1.2 用の新しい環境（ほかのテストと状態を分ける）

await test('v1.2-26/18. 初回：品質は簡易表示、仕上げディテールは閉じていて、見出しはiPhone幅の最初の画面内', async () => {
  L = await fresh();
  const { p } = L;
  const head = p.locator('.detail-toggle');
  assert((await head.getAttribute('aria-expanded')) === 'false', '初回は閉じていること');
  const box = await head.boundingBox();
  assert(box && box.y + box.height <= p.viewportSize().height, `見出しが最初の画面にない ${JSON.stringify(box)}`);
  assert((await p.locator('.quick-chips button').count()) === 6, 'クイック選択は6件');
  assert((await p.locator('.layer-quality li.tag').count()) === 0, '最初から全スライダーを並べない');
  assert((await p.locator('.mix-summary').innerText()).includes('品質'), '層ごとの件数');
  await p.screenshot({ path: join(out, 'v12-first.png') });
});

await test('v1.2-6/7/8/9. 品質タグを複数選択・個別強度・OFF・モデル別構文', async () => {
  const { p, prev, qrow } = L;
  await p.locator('.topbar select').selectOption('nai_v5');
  for (const t of ['amazing quality', 'very aesthetic', 'highres', 'masterpiece']) await p.locator('.quick-chips').getByRole('button', { name: t }).click();
  await p.locator('.layer-quality').getByRole('button', { name: '詳細設定' }).click();
  await qrow('素晴らしい品質').locator('input[type=range]').fill('1.5');
  await qrow('とても美的').locator('input[type=range]').fill('1.4');
  await qrow('高解像度').locator('input[type=range]').fill('1.3');
  await qrow('マスターピース').locator('input[type=range]').fill('1.2');
  let t = await prev();
  // 同じカテゴリ（美的評価）の中は選んだ順：very aesthetic → masterpiece
  assert(t === '1.5::amazing quality ::, 1.4::very aesthetic ::, 1.2::masterpiece ::, 1.3::highres ::', 'V5: ' + t);
  await qrow('高解像度').locator('.tag-toggle').click(); // OFF
  t = await prev();
  assert(!t.includes('highres'), 'OFFが出た: ' + t);
  await p.locator('.topbar select').selectOption('pixai_sdxl');
  t = await prev();
  assert(t === '(amazing quality:1.5), (very aesthetic:1.4), (masterpiece:1.2)', 'SDXL: ' + t);
  await p.locator('.topbar select').selectOption('nai_v4');
  t = await prev();
  assert(!t.includes('masterpiece') && t.includes('amazing quality'), 'V4 では masterpiece を出さない: ' + t);
  assert(await p.locator('.quick-chips .chip-unsupported', { hasText: 'masterpiece' }).isVisible(), '非対応の表示');
  await p.locator('.topbar select').selectOption('nai_v5');
});

await test('v1.2-10/11/12. NovelAI V5 の自動品質タグ（Standard）と重なると警告、手動選択は残る', async () => {
  const { p, prev } = L;
  await p.locator('.layer-quality select').selectOption('standard');
  const note = p.locator('.layer-quality .auto-note');
  await note.first().waitFor();
  const text = await note.first().innerText();
  assert(/masterpiece/.test(text) && /very aesthetic/.test(text) && /自動追加される可能性/.test(text), text);
  const t = await prev();
  assert(t.includes('1.2::masterpiece ::') && t.includes('1.4::very aesthetic ::'), '削除された: ' + t);
  await p.locator('.layer-quality select').selectOption('off');
  assert((await p.locator('.layer-quality .auto-note').count()) === 0, 'OFFなのに警告');
});

await test('v1.2-13/14/15/16. 仕上げディテール：6サブカテゴリ・複数選択・個別強度・外見リスク表示', async () => {
  const { p, drow } = L;
  await p.locator('.detail-toggle').click();
  const heads = await p.locator('.layer-detail .cat-head .cat-name').allInnerTexts();
  assert(JSON.stringify(heads) === JSON.stringify(['目・虹彩・まつ毛', '髪の描き込み・質感', '肌の質感', '唇・口元', '衣服・装飾・素材', '全体の細密さ']), heads.join());
  for (const c of ['髪の描き込み・質感', '肌の質感', '唇・口元']) await p.locator('.layer-detail .cat-head', { hasText: c }).click();
  await drow('詳細な虹彩').locator('.tag-toggle').click();
  await drow('詳細なまつ毛').locator('.tag-toggle').click();
  await drow('細い髪の毛筋').locator('.tag-toggle').click();
  await drow('肌の薄いツヤ').locator('.tag-toggle').click();
  await drow('自然な唇のツヤ').locator('.tag-toggle').click();
  await drow('詳細な虹彩').locator('input[type=range]').fill('1.4');
  await drow('詳細なまつ毛').locator('input[type=range]').fill('1.2');
  await drow('細い髪の毛筋').locator('input[type=range]').fill('1.3');
  await drow('肌の薄いツヤ').locator('input[type=range]').fill('0.7');
  await drow('自然な唇のツヤ').locator('input[type=range]').fill('0.8');
  assert((await drow('浮き毛・後れ毛').locator('.badge-risk').innerText()).includes('中'), 'リスク表示');
  assert(await drow('浮き毛・後れ毛').locator('.badge-adds').isVisible(), '要素追加の表示');
  await drow('浮き毛・後れ毛').locator('.tag-info').click();
  assert(/暫定分類/.test(await drow('浮き毛・後れ毛').locator('.tag-detail').innerText()), '暫定の明記');
  await drow('浮き毛・後れ毛').locator('.tag-info').click();
  assert((await p.locator('.selected-chips li').count()) === 5, '選択中一覧');
  assert((await p.locator('.layer-detail .cat-head', { hasText: '目・虹彩・まつ毛' }).locator('.cat-sel').innerText()) === '2', 'カテゴリ別の件数');
  await p.screenshot({ path: join(out, 'v12-detail.png'), fullPage: false });
});

await test('v1.2-19. 3層をまとめて出力（NovelAIは品質を末尾）', async () => {
  const { p, prev } = L;
  await p.locator('.picker input.search').fill('ligne claire');
  await p.locator('li.tag', { has: p.locator('.tag-ja', { hasText: /^リーニュ・クレール/ }) }).first().locator('.tag-toggle').click();
  await p.locator('.picker input.search').fill('');
  const t = await prev();
  assert(
    t === 'ligne claire, 1.4::detailed irises ::, 1.2::detailed eyelashes ::, 1.3::fine hair strands ::, 0.7::skin sheen ::, 0.8::natural lip sheen ::, 1.5::amazing quality ::, 1.4::very aesthetic ::, 1.2::masterpiece ::',
    t,
  );
});

await test('v1.2-20. 各層を個別にコピーできる', async () => {
  const { p, nav } = L;
  await nav('出力');
  const read = () => p.evaluate(() => navigator.clipboard.readText());
  const cases = {
    画風だけ: 'ligne claire',
    品質だけ: '1.5::amazing quality ::, 1.4::very aesthetic ::, 1.2::masterpiece ::',
    仕上げだけ: '1.4::detailed irises ::, 1.2::detailed eyelashes ::, 1.3::fine hair strands ::, 0.7::skin sheen ::, 0.8::natural lip sheen ::',
    '画風＋仕上げ': 'ligne claire, 1.4::detailed irises ::, 1.2::detailed eyelashes ::, 1.3::fine hair strands ::, 0.7::skin sheen ::, 0.8::natural lip sheen ::',
  };
  try {
    for (const [label, want] of Object.entries(cases)) {
      await p.locator('.copy-menu').getByRole('button', { name: label, exact: true }).click();
      const got = await read();
      assert(got === want, `${label}: ${got}`);
    }
    await p.locator('.copy-menu').getByRole('button', { name: '画風＋品質＋仕上げ' }).click();
    assert((await read()).split(', ').length === 9, '3層');
    await p.getByRole('button', { name: '全体をコピー' }).click();
    assert((await read()) === (await p.locator('pre.preview').innerText()).trim(), '全体');
  } finally {
    await nav('調合');
  }
});

await test('v1.2-17/18. 閉じても選択は有効。開閉状態は再アクセス時に復元、レシピを切り替えても変わらない', async () => {
  const { p, prev } = L;
  await p.locator('.detail-toggle').click(); // 閉じる
  assert((await p.locator('.detail-toggle').innerText()).includes('5タグ選択中'), '件数表示');
  assert((await prev()).includes('detailed irises'), '閉じたら出力から消えた');
  await p.locator('.detail-toggle').click(); // 開く
  await p.waitForTimeout(300);
  await p.reload();
  assert((await p.locator('.detail-toggle').getAttribute('aria-expanded')) === 'true', '開いた状態が復元されない');
  await p.locator('.detail-toggle').click(); // 閉じる
  await p.reload();
  assert((await p.locator('.detail-toggle').getAttribute('aria-expanded')) === 'false', '閉じた状態が復元されない');
  await p.locator('.detail-toggle').click(); // 開いておく
});

await test('v1.2-21/25. 3層のレシピを保存・読み込み。リセット後の「元に戻す」で3層が戻る', async () => {
  const { p, nav, prev } = L;
  const before = await prev();
  await nav('保存棚');
  await p.getByRole('button', { name: '新しいレシピとして保存' }).click();
  await p.locator('.dlg input').fill('3層レシピ');
  await p.locator('.dlg').getByRole('button', { name: '保存' }).click();
  await nav('調合');
  await p.locator('.mix-head').getByRole('button', { name: /調合をリセット/ }).click();
  await p.locator('.dlg').getByRole('button', { name: 'リセットする' }).click();
  assert((await p.locator('.mix-summary b').allInnerTexts()).every((t) => t === '0'), '3層が空にならない');
  assert((await p.locator('.detail-toggle').getAttribute('aria-expanded')) === 'true', 'リセットで開閉状態が変わった');
  await p.locator('.toast').last().getByRole('button', { name: '元に戻す' }).click();
  assert((await prev()) === before, '元に戻らない');
  await p.locator('.mix-head').getByRole('button', { name: /調合をリセット/ }).click();
  await p.locator('.dlg').getByRole('button', { name: 'リセットする' }).click();
  await nav('保存棚');
  await p.locator('.shelf-list li', { hasText: '3層レシピ' }).getByRole('button', { name: '読み込んで編集' }).click();
  assert((await prev()) === before, 'レシピから3層が復元されない');
  // 一部だけ読み込む：品質だけ
  await p.locator('.mix-head').getByRole('button', { name: /調合をリセット/ }).click();
  await p.locator('.dlg').getByRole('button', { name: 'リセットする' }).click();
  await nav('保存棚');
  await p.locator('.shelf-list li', { hasText: '3層レシピ' }).getByRole('button', { name: '一部だけ読み込む' }).click();
  await p.locator('.dlg').getByRole('button', { name: /品質だけ/ }).click();
  const q = await prev();
  assert(q === '1.5::amazing quality ::, 1.4::very aesthetic ::, 1.2::masterpiece ::', '品質だけ: ' + q);
  await nav('保存棚');
  await p.locator('.shelf-list li', { hasText: '3層レシピ' }).getByRole('button', { name: '読み込んで編集' }).click();
  await p.locator('.dlg').getByRole('button', { name: '読み込む' }).click().catch(() => {});
});

await test('v1.2-22. JSONバックアップに3層が入り、別環境で同じ出力になる', async () => {
  const { p, nav, prev } = L;
  const want = await prev();
  await nav('保存棚');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '全体を書き出す（JSON）' }).click()]);
  const f = join(out, 'v12-backup.json');
  await dl.saveAs(f);
  const j = JSON.parse(await readFile(f, 'utf8'));
  const r = j.recipes.find((x) => x.name === '3層レシピ');
  assert(j.schemaVersion === 3 && r.quality.length === 4 && r.detail.length === 5, 'バックアップの中身');
  const L2 = await fresh();
  await L2.nav('保存棚');
  await L2.p.locator('input[type=file]').nth(1).setInputFiles(f); // 完全復元
  await L2.p.locator('.dlg').getByRole('button', { name: '置き換える' }).click();
  await L2.p.locator('.shelf-list li', { hasText: '3層レシピ' }).getByRole('button', { name: '読み込んで編集' }).click();
  await L2.p.locator('.dlg').getByRole('button', { name: '読み込む' }).click().catch(() => {});
  const got = await L2.prev();
  assert(got === want, `復元後が違う\n${got}\n${want}`);
  assert(L2.errs.length === 0, L2.errs.join());
  await L2.c.close();
  await nav('調合');
});

await test('v1.2-23/24. v1.1 の保存データ（端末内）をそのまま開ける・v1.1 と同じ出力', async () => {
  const ls = await readFile(join(here, '..', 'tests', 'fixtures', 'v1.1-localstorage.json'), 'utf8');
  const exp = JSON.parse(await readFile(join(here, '..', 'tests', 'fixtures', 'v1.1-expected.json'), 'utf8'));
  const L3 = await fresh();
  await L3.p.evaluate((s) => localStorage.setItem('sbw.state.v1', s), JSON.stringify(JSON.parse(ls)));
  await L3.p.reload();
  let t = await L3.prev();
  assert(t === exp.nai_v5, `V5\n${t}\n${exp.nai_v5}`);
  await L3.p.locator('.topbar select').selectOption('pixai_sdxl');
  t = await L3.prev();
  assert(t === exp.pixai_sdxl, `SDXL\n${t}`);
  assert((await L3.p.locator('.mix-summary b').nth(1).innerText()) === '0' && (await L3.p.locator('.mix-summary b').nth(2).innerText()) === '0', '品質・仕上げは未選択で始まる');
  await L3.nav('保存棚');
  assert(await L3.p.locator('.shelf-list li', { hasText: 'v1.1の画風グループ' }).isVisible(), 'グループ');
  assert(await L3.p.locator('.shelf-list li', { hasText: 'thin brown colored outlines' }).isVisible(), '自作タグ');
  assert(L3.errs.length === 0, L3.errs.join());
  await L3.c.close();
});

await test('v1.2. 調合画面の検索から品質・仕上げのタグも探せる', async () => {
  const { p } = L;
  await p.locator('.picker input.search').fill('irises');
  await p.locator('.layer-hits').waitFor();
  assert(/詳細な虹彩/.test(await p.locator('.layer-hits').innerText()), '検索結果');
  await p.locator('.picker input.search').fill('');
});

await test('v1.2-27. 仕上げを全件表示・全サブカテゴリを開いても操作が重くならない', async () => {
  const { p, drow } = L;
  await p.locator('.layer-detail').getByRole('radiogroup', { name: '仕上げディテールの表示件数' }).getByRole('radio', { name: /すべて/ }).click();
  for (const c of ['目・虹彩・まつ毛', '髪の描き込み・質感', '肌の質感', '唇・口元', '衣服・装飾・素材', '全体の細密さ']) {
    const h = p.locator('.layer-detail .cat-head', { hasText: c });
    if ((await h.getAttribute('aria-expanded')) !== 'true') await h.click();
  }
  const n = await p.locator('.layer-detail li.tag').count();
  assert(n === 47, `全件 ${n}`);
  const t0 = Date.now();
  for (const ja of ['詳細な目', '詳細な瞳孔', '輪郭のはっきりしたまつ毛', '光沢のある目', '髪の細部描写', 'なめらかな肌', '艶やかな唇', '細部まで描かれた布地', '布地の質感', '細部のディテール']) {
    await drow(ja).locator('.tag-toggle').click();
    await drow(ja).locator('input[type=range]').fill('1.1');
  }
  const ms = Date.now() - t0;
  console.log(`      （20操作 ${ms}ms）`);
  assert(ms < 8000, `遅い ${ms}ms`);
  await p.screenshot({ path: join(out, 'v12-detail-all.png') });
  assert(L.errs.length === 0, L.errs.join());
  await L.c.close();
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
