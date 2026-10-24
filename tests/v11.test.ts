// v1.1：NovelAI公式タグ拡充・年タグ・複雑度・リセット・互換性
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BASIC_COUNT,
  DICTIONARY_TAGS,
  RAW_NAI_TAGS,
  RAW_TAGS,
  RECON,
  buildIndex,
  isSupported,
  searchTags,
} from '../src/core/dictionary';
import {
  activeGroup,
  addYear,
  effectiveItems,
  emptyWorkspace,
  isMixEmpty,
  removeYear,
  resetMix,
  setComplexity,
  setItem,
  setYear,
  validateYear,
} from '../src/core/mix';
import { evaluateRelations } from '../src/core/relations';
import { renderPrompt } from '../src/core/render';
import { DEFAULT_SETTINGS, exportBackup, importIntoState, initialState, migrateState, restoreFromBackup } from '../src/core/schema';
import { PROFILE_IDS, type ProfileId, type Workspace } from '../src/core/types';

const index = buildIndex([]);
const known = (c: Parameters<typeof buildIndex>[0]) => new Set(buildIndex(c).byId.keys());
const S = (profile: ProfileId, extra: Partial<typeof DEFAULT_SETTINGS> = {}) => ({ ...DEFAULT_SETTINGS, profile, ...extra });
const tagOf = (prompt: string) => DICTIONARY_TAGS.find((t) => t.prompt === prompt)!;
const idOf = (prompt: string) => tagOf(prompt).id;
function ws(...pairs: [string, number][]): Workspace {
  let w = emptyWorkspace();
  for (const [p, s] of pairs) w = setItem(w, w.activeGroupId, idOf(p), { strength: s });
  return w;
}
const out = (w: Workspace, profile: ProfileId, extra = {}) =>
  renderPrompt(effectiveItems(w, index), S(profile, extra), { years: w.years, complexity: w.complexity });
const fixture = (f: string) => readFileSync(join(__dirname, 'fixtures', f), 'utf8');

// 公式ページから抽出した画風関連タグ（2026-10-24、Unique Artstyles 全95件）
const OFFICIAL_ARTSTYLES = [
  'very aesthetic', 'aesthetic',
  'traditional media', 'faux traditional media', 'mixed media', 'unconventional media',
  'acrylic paint (medium)', 'ballpoint pen (medium)', 'calligraphy brush (medium)', 'colored pencil (medium)', 'graphite (medium)', 'ink (medium)', 'marker (medium)', 'millipen (medium)', 'nib pen (medium)', 'oil painting (medium)', 'painting (medium)', 'pastel (medium)', 'pen (medium)', 'watercolor (medium)', 'watercolor pencil (medium)',
  '3d', 'blender (medium)', 'ai-generated', 'ai-assisted', 'anime screencap', 'pixel art', 'dithering',
  'abstract', 'surreal', 'art nouveau', 'impressionism', 'ligne claire', 'nihonga', 'ukiyo-e', 'realistic', 'photorealistic', 'retro artstyle', 'painterly', 'sketch', 'lineart', 'no lineart', 'jaggy lines', 'outline', 'vector trace', 'color trace', 'production art', 'animation paper', 'game cg', 'official art', 'shikishi', 'oekaki', 'tegaki', 'year XXXX',
  'anime coloring', 'colorful', 'dark', 'limited palette', 'partially colored', 'spot color', 'monochrome', 'greyscale', 'muted color', 'pale color', 'pastel colors', 'flat color', 'high contrast', 'sepia',
  'aqua theme', 'black theme', 'blue theme', 'brown theme', 'green theme', 'grey theme', 'orange theme', 'pink theme', 'purple theme', 'red theme', 'white theme', 'yellow theme',
  'backlighting', 'bloom', 'bokeh', 'chromatic aberration', 'depth of field', 'diffraction spikes', 'drop shadow', 'emphasis lines', 'speed lines', 'motion lines', 'glitch', 'halftone', 'lens flare', 'motion blur', 'soft focus',
];
const V5_OTHER = ['depthness', 'attractive male', 'meta:novel era', 'meta:golden era', 'visual novel art', 'visual novel bg', 'visual novel cg', 'visual novel chibi', 'visual novel sprite', 'location'];

describe('タグ辞書', () => {
  it('1. 新規タグIDの重複なし・既存IDと衝突しない', () => {
    const ids = DICTIONARY_TAGS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RAW_NAI_TAGS).toHaveLength(69);
    expect(RAW_NAI_TAGS.every((t) => t.ID.startsWith('NAI-'))).toBe(true);
  });
  it('2. 既存329タグが欠損せず、内容も変わっていない', () => {
    expect(RAW_TAGS).toHaveLength(329);
    const orig = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'style_tags.json'), 'utf8')).tags;
    for (const t of orig) {
      const d = DICTIONARY_TAGS.find((x) => x.id === t.ID)!;
      expect(d.prompt).toBe(t.Prompt);
      expect(d.evidenceLevel).toBe(t.Evidence_Level);
      expect(d.validationStatus).toBe(t.Validation_Status);
      expect(d.mvpCore).toBe(t.MVP_Core);
    }
  });
  it('3. 公式ページの画風関連タグがすべて照合結果にあり、収録・一致・専用UI・除外のどれかに分類されている', () => {
    const recTags = new Set(RECON.entries.map((e) => e.officialTag));
    for (const t of [...OFFICIAL_ARTSTYLES, ...V5_OTHER, 'low complexity', 'medium complexity', 'high complexity', 'ultra complexity']) expect(recTags.has(t), t).toBe(true);
    for (const t of OFFICIAL_ARTSTYLES) {
      const e = RECON.entries.find((x) => x.officialTag === t && x.page.includes('artstyles'))!;
      if (e.status === 'exact' || e.status === 'added') {
        // 実際に辞書から同じ文字列で引ける
        const id = e.existingId ?? e.newId!;
        expect(index.byId.get(id)!.prompt.toLowerCase()).toBe(t.toLowerCase());
      } else {
        expect(['special_ui', 'excluded']).toContain(e.status);
        if (e.status === 'excluded') expect(e.reason!.length).toBeGreaterThan(5);
      }
    }
    const counts = RECON.entries.reduce<Record<string, number>>((a, e) => ((a[e.status] = (a[e.status] ?? 0) + 1), a), {});
    expect(counts).toEqual({ exact: 26, added: 69, special_ui: 6, excluded: 27, duplicate_listing: 1 });
  });
  it('3b. 公式の表記どおりの文字列が辞書にある（表記揺れで重複させない）', () => {
    for (const t of OFFICIAL_ARTSTYLES.filter((x) => !['very aesthetic', 'aesthetic', 'ai-generated', 'ai-assisted', 'year XXXX'].includes(x))) {
      expect(DICTIONARY_TAGS.filter((d) => d.prompt.toLowerCase() === t.toLowerCase()), t).toHaveLength(1);
    }
  });
  it('4. 公式掲載と画像効果の検証を混同しない（公式タグも検証は未実施、既存タグも検証済みにならない）', () => {
    for (const t of DICTIONARY_TAGS) {
      expect(t.validationStatus, t.id).toMatch(/未実施/);
      expect(t.validationStatus).not.toMatch(/検証済|確認済/);
    }
    // 既存の再構築タグの根拠レベルは変えない（公式掲載は別項目で表示）
    const grey = tagOf('greyscale');
    expect(grey.evidenceLevel).toBe('reconstructed_unverified_candidate');
    expect(grey.official?.checkedAt).toBe('2026-10-24');
    expect(tagOf('watercolor (medium)').official?.url).toBe('https://docs.novelai.net/en/image/tutorial-artstyles/');
    expect(tagOf('cel shading').official).toBeNull(); // NAI公式ページには無い（Tsubaki資料由来）
  });
  it('4b. 追加タグの説明は個別（使い回しなし）', () => {
    const d = RAW_NAI_TAGS.map((t) => t.Description_JA);
    expect(new Set(d).size).toBe(d.length);
  });
  it('5. 類似表現の複数選択が維持される（watercolor (medium) と watercolor wash、muted color と muted colors）', () => {
    const w = ws(['watercolor (medium)', 1.2], ['watercolor wash', 1], ['muted color', 1], ['muted colors', 0.8]);
    expect(activeGroup(w).items).toHaveLength(4);
    // カテゴリ順（塗り → 色彩 → 画材）に並ぶ。どれも消えない
    expect(out(w, 'nai_v45').style).toBe('watercolor wash, muted color, 0.8::muted colors ::, 1.2::watercolor (medium) ::');
    const hits = evaluateRelations(new Set(effectiveItems(w, index).map((e) => e.tagId)));
    expect(hits.find((h) => h.type === 'similar')?.bothActive).toBe(true); // 表記揺れの情報表示のみ
  });
  it('5b. 公式の代替表現は同義として扱い、別名でも検索できる', () => {
    expect(searchTags(DICTIONARY_TAGS, 'blender').map((t) => t.prompt)).toEqual(expect.arrayContaining(['3d', 'blender (medium)']));
    expect(searchTags(DICTIONARY_TAGS, 'speed lines').map((t) => t.prompt)).toEqual(expect.arrayContaining(['speed lines', 'emphasis lines']));
    expect(searchTags(DICTIONARY_TAGS, '水彩').map((t) => t.prompt)).toEqual(expect.arrayContaining(['watercolor (medium)', 'watercolor wash', 'watercolor pencil (medium)']));
    expect(searchTags(DICTIONARY_TAGS, 'りーにゅくれーる').map((t) => t.prompt)).toContain('ligne claire');
    expect(searchTags(DICTIONARY_TAGS, 'NAI公式').length).toBe(DICTIONARY_TAGS.filter((t) => t.official).length);
    const h = evaluateRelations(new Set([idOf('3d'), idOf('blender (medium)')]));
    expect(h[0]).toMatchObject({ type: 'synonym', bothActive: true });
  });
  it('6. V5専用タグは V5 だけ公式対応。他モデルは非対応、通常の公式タグの PIXAI は未検証', () => {
    for (const p of ['depthness', 'meta:novel era', 'meta:golden era', 'visual novel art', 'visual novel cg']) {
      const t = tagOf(p);
      expect(t.v5Only).toBe(true);
      expect(t.support.nai_v5).toBe('official');
      for (const x of PROFILE_IDS.filter((q) => q !== 'nai_v5')) expect(t.support[x], `${p} ${x}`).toBe('unsupported');
    }
    const wc = tagOf('watercolor (medium)');
    expect(wc.support.nai_v4).toBe('official');
    expect(wc.support.pixai_sdxl).toBe('unverified');
    expect(tagOf('cel shading').support.nai_v5).toBe('unverified');
  });
  it('基本表示：ligne claire を昇格、有用な公式タグを追加（72件より多くてよい）', () => {
    expect(tagOf('ligne claire').basic).toBe(true);
    expect(tagOf('ligne claire').mvpCore).toBe(false); // 元データの MVP_Core は変えない
    for (const p of ['watercolor (medium)', 'faux traditional media', 'flat color', 'anime coloring']) expect(tagOf(p).basic, p).toBe(true);
    expect(BASIC_COUNT).toBe(86);
  });
});

describe('年タグ・複雑度', () => {
  it('7/8. V5で複雑度を選択・変更・解除でき、常に1つだけ出力される', () => {
    let w = ws(['bloom', 1]);
    w = setComplexity(w, 'high');
    expect(out(w, 'nai_v5').style).toBe('bloom, high complexity');
    w = setComplexity(w, 'ultra');
    const s = out(w, 'nai_v5').style;
    expect(s).toBe('bloom, ultra complexity');
    expect(s.match(/complexity/g)).toHaveLength(1);
    w = setComplexity(w, null);
    expect(out(w, 'nai_v5').style).toBe('bloom');
  });
  it('複雑度は数値ウェイトを付けない', () => {
    const w = setComplexity(ws(['bloom', 1.2]), 'low');
    expect(out(w, 'nai_v5').style).toBe('1.2::bloom ::, low complexity');
  });
  it('9. V5以外では V5専用の項目を出力せず、設定は保持し、V5に戻すと復元される', () => {
    let w = ws(['depthness', 1.2], ['bloom', 1]);
    w = setComplexity(w, 'medium');
    for (const p of PROFILE_IDS.filter((x) => x !== 'nai_v5')) {
      const r = out(w, p);
      expect(r.style, p).not.toMatch(/depthness|complexity/);
      expect(r.unsupported.tagIds).toEqual([idOf('depthness')]);
      expect(r.unsupported.complexity).toBe(true);
      expect(r.warnings.join()).toMatch(/V5/);
    }
    expect(activeGroup(w).items.find((i) => i.tagId === idOf('depthness'))).toMatchObject({ on: true, strength: 1.2 });
    expect(out(w, 'nai_v5').style).toBe('1.2::depthness ::, bloom, medium complexity');
  });
  it('10/12. 年タグは year 2024 形式で、モデル仕様の強調構文になる', () => {
    let w = ws(['bloom', 1]);
    w = addYear(w, 2024, 1.5);
    w = addYear(w, 2025, 1.5);
    for (const p of ['nai_v4', 'nai_v45', 'nai_v5'] as const) expect(out(w, p).style).toBe('bloom, 1.5::year 2024 ::, 1.5::year 2025 ::');
    expect(out(w, 'nai_v3').style).toBe(`bloom, ${'{'.repeat(8)}year 2024${'}'.repeat(8)}, ${'{'.repeat(8)}year 2025${'}'.repeat(8)}`);
    w = setYear(w, 2025, { strength: 1 });
    expect(out(w, 'nai_v5').style).toBe('bloom, 1.5::year 2024 ::, year 2025');
  });
  it('年タグ：PIXAIは既定で出力せず、実験モードでのみ出力（実験的と明示）', () => {
    const w = addYear(ws(['bloom', 1]), 2014, 1.2);
    const r = out(w, 'pixai_sdxl');
    expect(r.style).toBe('bloom');
    expect(r.unsupported.years).toBe(1);
    const x = out(w, 'pixai_sdxl', { pixaiYears: true });
    expect(x.style).toBe('bloom, (year 2014:1.2)');
    expect(x.warnings.join()).toMatch(/実験的/);
    const t = out(w, 'pixai_tsubaki3', { pixaiYears: true });
    expect(t.style).toBe('bloom, year 2014'); // 自然言語方式では強度を付けない
  });
  it('年タグ：OFF・削除・入力検査', () => {
    let w = addYear(addYear(emptyWorkspace(), 2024), 2010);
    w = setYear(w, 2010, { on: false });
    expect(out(w, 'nai_v5').style).toBe('year 2024');
    w = removeYear(w, 2024);
    expect(w.years.map((y) => y.year)).toEqual([2010]);
    expect(validateYear('2024', [])).toBeNull();
    expect(validateYear('２０２４', [])).toBeNull(); // 全角も可
    expect(validateYear('24', [])).not.toBeNull();
    expect(validateYear('1800', [])).not.toBeNull();
    expect(validateYear('20a4', [])).not.toBeNull();
    expect(validateYear('2010', w.years)).toMatch(/すでに/);
    let many = emptyWorkspace();
    for (let y = 2000; y < 2010; y++) many = addYear(many, y);
    expect(validateYear('2020', many.years)).toMatch(/10件/);
  });
  it('11. 複数の年タグ・複雑度がレシピとして保存・復元される', () => {
    let w = addYear(addYear(ws(['bloom', 1]), 2024, 1.5), 2025, 1.3);
    w = setComplexity(w, 'high');
    const state = { ...initialState(), workspace: w, recipes: [{ id: 'r1', name: '年入り', note: '', createdAt: '2026-10-24T00:00:00.000Z', updatedAt: '2026-10-24T00:00:00.000Z', groups: w.groups, dedupeRule: 'first' as const, profile: 'nai_v5' as const, years: w.years, complexity: w.complexity, quality: [], detail: [] }] };
    const back = restoreFromBackup(JSON.stringify(exportBackup(state)));
    expect(back.state.recipes[0].years).toEqual([{ year: 2024, strength: 1.5, on: true }, { year: 2025, strength: 1.3, on: true }]);
    expect(back.state.recipes[0].complexity).toBe('high');
    expect(back.state.workspace.years).toEqual(w.years);
    const m = migrateState(JSON.parse(JSON.stringify(state)));
    expect(m.state.workspace.complexity).toBe('high');
  });
});

describe('リセット（共通処理）', () => {
  it('15/16. 調合だけを空にし、重複規則は残す（保存棚・自作タグ・出力設定は Workspace の外）', () => {
    let w = addYear(ws(['bloom', 1.2], ['bokeh', 1]), 2024);
    w = setComplexity({ ...w, dedupeRule: 'max', sourceRecipeId: 'r1' }, 'high');
    const r = resetMix(w);
    expect(isMixEmpty(r)).toBe(true);
    expect(r.years).toEqual([]);
    expect(r.complexity).toBeNull();
    expect(r.sourceRecipeId).toBeNull();
    expect(r.dedupeRule).toBe('max');
    expect(w.groups[0].items).toHaveLength(2); // 元の値は変えない（元に戻すで使う）
  });
});

describe('互換性（v1.0 の実データ）', () => {
  const lsRaw = JSON.parse(fixture('v1.0-localstorage.json'));
  const backupText = fixture('v1.0-backup.json');
  const expected = JSON.parse(fixture('v1.0-expected.json'));

  it('20a. v1.0 の localStorage をそのまま読み込める（警告なし）', () => {
    expect(lsRaw.schemaVersion).toBe(1);
    const m = migrateState(lsRaw);
    expect(m.futureVersion).toBe(false);
    expect(m.warnings).toEqual([]);
    expect(m.state.schemaVersion).toBe(3); // v1.2 で 3
    expect(m.state.recipes).toHaveLength(1);
    expect(m.state.groups).toHaveLength(1);
    expect(m.state.workspace.years).toEqual([]);
    expect(m.state.workspace.complexity).toBeNull();
  });
  it('20b. 既存タグのID・強度、グループ、自作タグを維持（辞書に後から入った sketch の自作タグも消えない）', () => {
    const m = migrateState(lsRaw);
    expect(m.state.customTags.map((c) => c.prompt)).toEqual(['sketch', 'delicate thin lineart']);
    expect(m.state.customTags).toEqual(lsRaw.customTags);
    expect(m.state.recipes[0].groups).toEqual(lsRaw.recipes[0].groups);
    expect(m.state.groups[0].items).toEqual(lsRaw.groups[0].items);
    expect(m.state.groups[0].layer).toBe('style');
    expect(m.state.workspace.groups).toEqual(lsRaw.workspace.groups);
  });
  it('20c. v1.0 のレシピは v1.1 でも同じプロンプトを出力する', () => {
    const m = migrateState(lsRaw);
    const r = m.state.recipes[0];
    const idx = buildIndex(m.state.customTags);
    const w: Workspace = { groups: r.groups, activeGroupId: r.groups[0].id, dedupeRule: r.dedupeRule, sourceRecipeId: r.id, years: r.years, complexity: r.complexity, quality: r.quality, detail: r.detail };
    const s = renderPrompt(effectiveItems(w, idx), S(r.profile), { years: r.years, complexity: r.complexity }).style;
    expect(r.profile).toBe(expected.profile);
    expect(s).toBe(expected.prompt);
  });
  it('20d. v1.0 の JSONバックアップを「追加」でも「完全復元」でも読み込める', () => {
    const add = importIntoState(initialState(), backupText, known);
    expect(add.added).toEqual({ recipes: 1, groups: 1, customTags: 2 });
    expect(add.unknownTagIds).toEqual([]);
    const full = restoreFromBackup(backupText);
    expect(full.state.recipes[0].name).toBe('v1.0のレシピ');
    expect(full.state.customTags).toHaveLength(2);
  });
  it('21. v1.1 のデータを保存→再読み込みして同一', () => {
    const m = migrateState(lsRaw);
    const s2 = { ...m.state, workspace: setComplexity(addYear(m.state.workspace, 2024, 1.5), 'high') };
    const again = migrateState(JSON.parse(JSON.stringify(s2)));
    expect(again.warnings).toEqual([]);
    expect(again.state).toEqual(s2);
  });
  it('不明な項目は無断で捨てない（レシピの未知フィールドを保持して書き出す）', () => {
    const raw = JSON.parse(backupText);
    raw.recipes[0].futureField = { a: 1 };
    const r = restoreFromBackup(JSON.stringify(raw));
    expect(r.state.recipes[0].extra).toEqual({ futureField: { a: 1 } });
    const re = JSON.parse(JSON.stringify(exportBackup(r.state)));
    expect(re.recipes[0].extra).toEqual({ futureField: { a: 1 } });
  });
  it('新しい版（schemaVersion 4）は読み込まずに退避扱い', () => {
    expect(migrateState({ ...lsRaw, schemaVersion: 4 }).futureVersion).toBe(true);
  });
});

describe('出力の安全性', () => {
  it('(medium) を含むタグ：NAI はそのまま、SDXL は括弧をエスケープして警告', () => {
    const w = ws(['watercolor (medium)', 1.2], ['ink (medium)', 1]);
    expect(out(w, 'nai_v5').style).toBe('1.2::watercolor (medium) ::, ink (medium)');
    const s = out(w, 'pixai_sdxl');
    expect(s.style).toBe('(watercolor \\(medium\\):1.2), ink \\(medium\\)');
    expect(s.warnings.join()).toMatch(/PIXAIでの解釈は未確認/);
    expect(out(w, 'nai_v3').style).toBe(`${'{'.repeat(4)}watercolor (medium)${'}'.repeat(4)}, ink (medium)`);
  });
  it('isSupported は unsupported だけを弾く', () => {
    expect(isSupported(tagOf('depthness'), 'nai_v45')).toBe(false);
    expect(isSupported(tagOf('watercolor (medium)'), 'pixai_tsubaki2')).toBe(true);
  });
  it('PIXAI 出力に adult・bust を含めない（追加タグにも無い）', () => {
    for (const t of RAW_NAI_TAGS) expect(t.Prompt.toLowerCase()).not.toMatch(/adult|bust/);
  });
});
