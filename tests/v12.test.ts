// v1.2：品質調合・仕上げディテール（3層）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DETAIL_DATA,
  DETAIL_PRESETS,
  DETAIL_TAGS,
  DETAIL_VIEW_TAGS,
  DICTIONARY_TAGS,
  LAYER_RULES,
  PRESETS,
  QUALITY_DATA,
  QUALITY_PRESETS,
  QUALITY_TAGS,
  buildIndex,
  searchTags,
} from '../src/core/dictionary';
import { autoQualityInfo, naiAutoTags } from '../src/core/autoQuality';
import {
  applyPreset,
  applyToLayer,
  countAll,
  countLayer,
  effectiveItems,
  emptyWorkspace,
  isMixEmpty,
  resetMix,
  setItem,
  setLayerItem,
  toggleLayerItem,
} from '../src/core/mix';
import { evaluateRelations } from '../src/core/relations';
import { layerOrder, renderPrompt } from '../src/core/render';
import { DEFAULT_SETTINGS, exportBackup, importIntoState, initialState, migrateState, restoreFromBackup } from '../src/core/schema';
import { PROFILE_IDS, type ProfileId, type Recipe, type Workspace } from '../src/core/types';

const index = buildIndex([]);
const all = index.all;
const S = (profile: ProfileId, extra: Partial<typeof DEFAULT_SETTINGS> = {}) => ({ ...DEFAULT_SETTINGS, profile, ...extra });
const byPrompt = (p: string) => all.find((t) => t.prompt === p)!;
const id = (p: string) => byPrompt(p).id;
const out = (w: Workspace, profile: ProfileId, extra: Partial<typeof DEFAULT_SETTINGS> = {}, idx = index) =>
  renderPrompt(effectiveItems(w, idx, extra.order ?? 'category'), S(profile, extra), { years: w.years, complexity: w.complexity });
function mix(style: [string, number][] = [], quality: [string, number][] = [], detail: [string, number][] = []): Workspace {
  let w = emptyWorkspace();
  for (const [p, s] of style) w = setItem(w, w.activeGroupId, id(p), { strength: s });
  for (const [p, s] of quality) w = setLayerItem(w, 'quality', id(p), { strength: s });
  for (const [p, s] of detail) w = setLayerItem(w, 'detail', id(p), { strength: s });
  return w;
}
const fixture = (f: string) => readFileSync(join(__dirname, 'fixtures', f), 'utf8');

describe('データ整合性', () => {
  it('1. 既存398の画風タグが欠損しない', () => {
    expect(DICTIONARY_TAGS).toHaveLength(398);
    expect(all.filter((t) => t.layer === 'style')).toHaveLength(398);
  });
  it('2. 新規タグIDの重複がない・既存IDと衝突しない', () => {
    const ids = all.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(QUALITY_TAGS).toHaveLength(28);
    expect(DETAIL_TAGS).toHaveLength(44);
    expect(QUALITY_TAGS.every((t) => /^QLT-[A-Z]{3}-\d{3}$/.test(t.id))).toBe(true);
    expect(DETAIL_TAGS.every((t) => /^DTL-[A-Z]{3}-\d{3}$/.test(t.id))).toBe(true);
  });
  it('3. 英語プロンプトが完全一致するタグは3層を通して1つのID（high detail は品質・仕上げの両方から選べる）', () => {
    const prompts = all.map((t) => t.prompt.toLowerCase());
    expect(new Set(prompts).size).toBe(prompts.length);
    for (const p of ['high detail', 'highly detailed', 'intricate details']) {
      const t = byPrompt(p);
      expect(t.layers).toEqual(['quality', 'detail']);
      expect(DETAIL_VIEW_TAGS.filter((x) => x.id === t.id)).toHaveLength(1);
    }
    expect(DETAIL_VIEW_TAGS).toHaveLength(47);
    // 表現が違うものは統合しない
    expect(id('high detail')).not.toBe(id('highly detailed'));
  });
  it('4. 参照切れがない（プリセット・関係・クイック・共有）', () => {
    for (const p of [...QUALITY_PRESETS, ...DETAIL_PRESETS]) for (const i of p.items) expect(index.byId.has(i.tagId), `${p.id} ${i.tagId}`).toBe(true);
    for (const r of LAYER_RULES) for (const x of r.tagIds) expect(index.byId.has(x)).toBe(true);
    for (const q of QUALITY_DATA.quickIds) expect(index.byId.has(q)).toBe(true);
    for (const s of DETAIL_DATA.sharedFromQuality) expect(index.byId.get(s.ref)?.detailCategory).toBe(s.detailCategory);
  });
  it('5. 出典区分と検証状況：公式掲載・使用例と画像検証を混同しない', () => {
    for (const t of [...QUALITY_TAGS, ...DETAIL_TAGS]) {
      expect(t.validationStatus).toMatch(/未実施/);
      expect(t.sourceClass).toBeTruthy();
      expect(t.evidence.length).toBeGreaterThan(0);
    }
    expect(byPrompt('best quality').sourceClass).toBe('nai_special');
    expect(byPrompt('gradation eyes').sourceClass).toBe('official_example');
    expect(byPrompt('flyaway hairs').sourceClass).toBe('official_phrase');
    expect(byPrompt('detailed irises').sourceClass).toBe('research_candidate');
    // 説明文は個別
    const d = [...QUALITY_TAGS, ...DETAIL_TAGS].map((t) => t.description);
    expect(new Set(d).size).toBe(d.length);
  });
  it('公式の対応モデル：masterpiece は V4.5 以上、top aesthetic は資料の食い違いを未検証として扱う', () => {
    const m = byPrompt('masterpiece');
    expect([m.support.nai_v3, m.support.nai_v4, m.support.nai_v45, m.support.nai_v5]).toEqual(['unsupported', 'unsupported', 'official', 'official']);
    const t = byPrompt('top aesthetic');
    expect([t.support.nai_v3, t.support.nai_v4, t.support.nai_v45, t.support.nai_v5]).toEqual(['unsupported', 'official', 'unverified', 'unverified']);
    expect(evaluateRelations(new Set([m.id, t.id]))[0]).toMatchObject({ type: 'synonym', bothActive: true });
    // 仕上げディテールは NovelAI での公式確認なし
    for (const x of DETAIL_TAGS) for (const p of ['nai_v3', 'nai_v4', 'nai_v45', 'nai_v5'] as const) expect(x.support[p]).toBe('unverified');
  });
});

describe('品質調合', () => {
  it('6/7. 複数選択でき、強度は独立', () => {
    let w = mix([], [['highres', 1.3], ['amazing quality', 1.5], ['very aesthetic', 1.4], ['masterpiece', 1.2]]);
    w = setLayerItem(w, 'quality', id('highres'), { strength: 0.9 });
    expect(w.quality.map((i) => i.strength)).toEqual([0.9, 1.5, 1.4, 1.2]);
    expect(countLayer(w, 'quality')).toBe(4);
  });
  it('8. OFFのタグは出力されない（値は保持）', () => {
    let w = mix([], [['best quality', 1.2], ['very aesthetic', 1]]);
    w = toggleLayerItem(w, 'quality', id('best quality'));
    expect(w.quality[0]).toMatchObject({ on: false, strength: 1.2 });
    for (const p of PROFILE_IDS) expect(out(w, p).quality).not.toMatch(/best quality/);
  });
  it('9. モデル別構文', () => {
    const w = mix([], [['amazing quality', 1.5], ['very aesthetic', 1.4], ['highres', 1]]);
    expect(out(w, 'nai_v5').quality).toBe('1.5::amazing quality ::, 1.4::very aesthetic ::, highres');
    expect(out(w, 'pixai_sdxl').quality).toBe('(amazing quality:1.5), (very aesthetic:1.4), highres');
    // Tsubaki（自然言語方式）では品質タグに強度を付けず、その旨を知らせる
    const t = out(w, 'pixai_tsubaki3');
    expect(t.quality).toBe('amazing quality, very aesthetic, highres');
    expect(t.warnings.join()).toMatch(/品質タグの強度を表現しない/);
    expect(out(w, 'pixai_tsubaki3', { tsubakiNumeric: true }).quality).toBe('(amazing quality:1.5), (very aesthetic:1.4), highres');
    expect(out(w, 'nai_v3').quality).toBe(`${'{'.repeat(8)}amazing quality${'}'.repeat(8)}, ${'{'.repeat(7)}very aesthetic${'}'.repeat(7)}, highres`);
  });
  it('公式に非対応の版では出力せず保持（masterpiece × V4）', () => {
    const w = mix([], [['masterpiece', 1.2], ['best quality', 1]]);
    const r = out(w, 'nai_v4');
    expect(r.quality).toBe('best quality');
    expect(r.unsupported.tagIds).toEqual([id('masterpiece')]);
    expect(r.warnings.join()).toMatch(/masterpiece/);
    expect(out(w, 'nai_v45').quality).toBe('best quality, 1.2::masterpiece ::'); // カテゴリ順：品質評価 → 美的評価
  });
  it('10. NovelAIの自動品質タグ設定（V5 は Light/Standard、ほかの版は公式の一覧）', () => {
    expect(naiAutoTags('nai_v5', 'light')).toEqual(['very aesthetic', 'amazing quality', 'no text']);
    expect(naiAutoTags('nai_v5', 'standard')).toEqual(['very aesthetic', 'masterpiece', 'no text']);
    expect(naiAutoTags('nai_v5', 'off')).toEqual([]);
    expect(naiAutoTags('nai_v5', 'unknown')).toBeNull();
    expect(naiAutoTags('nai_v45', 'on')).toEqual(['location', 'very aesthetic', 'masterpiece', 'no text']);
    expect(naiAutoTags('nai_v4', 'light')).toEqual(['no text', 'best quality', 'very aesthetic', 'absurdres']); // V4 には段階がないので ON として扱う
  });
  it('11/12. 重複は警告するが、手動選択は削除しない', () => {
    const w = mix([], [['masterpiece', 1.2], ['best quality', 1]]);
    const info = autoQualityInfo(S('nai_v5', { naiAutoQuality: 'standard' }), ['masterpiece', 'best quality']);
    expect(info.overlaps).toEqual(['masterpiece']);
    expect(info.notes.join()).toMatch(/NovelAI 側でも自動追加される可能性があります/);
    // 出力は変わらない（削除しない）
    expect(out(w, 'nai_v5', { naiAutoQuality: 'standard' }).quality).toBe('best quality, 1.2::masterpiece ::');
    // 未確認なら断定しない
    const u = autoQualityInfo(S('nai_v5'), ['masterpiece']);
    expect(u.autoTags).toBeNull();
    expect(u.notes.join()).toMatch(/断定できません/);
    // PIXAI：ONでも内容を入力しなければ断定しない。入力すれば重複を示す
    expect(autoQualityInfo(S('pixai_sdxl', { pixaiAutoQuality: 'on' }), ['best quality']).notes.join()).toMatch(/未確認/);
    expect(autoQualityInfo(S('pixai_sdxl', { pixaiAutoQuality: 'on', pixaiAutoQualityTags: 'masterpiece, Best Quality' }), ['best quality']).overlaps).toEqual(['best quality']);
  });
  it('品質の競合（同じ尺度の反対側）は警告、似た別タグは統合しない', () => {
    const h = evaluateRelations(new Set([id('best quality'), id('worst quality')]));
    expect(h[0]).toMatchObject({ type: 'conflict', level: 'warn', bothActive: true });
    expect(evaluateRelations(new Set([id('best quality'), id('amazing quality')]))).toEqual([]);
    expect(out(mix([], [['best quality', 1], ['amazing quality', 1]]), 'nai_v5').quality).toBe('best quality, amazing quality');
  });
  it('すべて初期OFF：アプリを開いただけでは品質タグを出力しない', () => {
    const w = initialState().workspace;
    expect(w.quality).toEqual([]);
    for (const p of PROFILE_IDS) expect(out(w, p).combined).toBe('');
  });
});

describe('仕上げディテール', () => {
  it('13. 6サブカテゴリ・基本24件', () => {
    expect(DETAIL_DATA.categories.map((c) => c.label)).toEqual(['目・虹彩・まつ毛', '髪の描き込み・質感', '肌の質感', '唇・口元', '衣服・装飾・素材', '全体の細密さ']);
    expect(DETAIL_VIEW_TAGS.filter((t) => t.detailBasic)).toHaveLength(24);
  });
  it('14/15. 同じ部位の類似タグを併用でき、強度は独立', () => {
    const w = mix([], [], [['detailed irises', 1.4], ['detailed eyelashes', 1.2], ['fine hair strands', 1.3], ['skin sheen', 0.7], ['natural lip sheen', 0.8], ['glossy lips', 1], ['shiny lips', 1]]);
    expect(out(w, 'nai_v5').detail).toBe('1.4::detailed irises ::, 1.2::detailed eyelashes ::, 1.3::fine hair strands ::, 0.7::skin sheen ::, 0.8::natural lip sheen ::, glossy lips, shiny lips');
  });
  it('16. 外見変更リスク・要素追加の表示情報がある（暫定分類）', () => {
    for (const t of DETAIL_TAGS) expect(['low', 'medium', 'high']).toContain(t.risk);
    expect(byPrompt('flyaway hairs')).toMatchObject({ risk: 'medium', addsElements: true });
    expect(byPrompt('water droplets').addsElements).toBe(true);
    expect(byPrompt('detailed irises').risk).toBe('low');
    // 外見設定は収録しない
    for (const p of ['big eyes', 'plump lips', 'pale skin', 'tan skin', 'shiny hair', 'highly detailed face']) expect(all.some((t) => t.prompt === p)).toBe(false);
  });
  it('Tsubaki 向け自然文テンプレート（実験的）。髪型・髪色などを新しく指定しない', () => {
    const w = mix([], [], [['fine hair strands', 1.3], ['skin sheen', 0.7], ['detailed irises', 1]]);
    const r = out(w, 'pixai_tsubaki3');
    // カテゴリ順（目 → 髪 → 肌）。0.7 は gentle → light、1.3 は pronounced、1.0 は修飾なし
    expect(r.detail).toBe('detail in the irises with layered gradients, keeping the eye color unchanged, pronounced fine, individually rendered hair strands, keeping the hairstyle and hair color unchanged, light sheen on the skin');
    expect(r.warnings.join()).toMatch(/実験的/);
    expect(out(w, 'pixai_tsubaki3', { tsubakiDetailNL: false }).detail).toBe('detailed irises, pronounced fine hair strands, gentle skin sheen');
    for (const t of DETAIL_TAGS) expect(t.nlTemplate ?? '').not.toMatch(/\b(blonde|black hair|red hair|long hair|short hair|ponytail|blue eyes)\b/i);
  });
  it('PIXAI 出力に adult・bust を含めない（自然文も含む）', () => {
    for (const t of [...QUALITY_TAGS, ...DETAIL_TAGS]) expect(`${t.prompt} ${t.nlTemplate ?? ''}`).not.toMatch(/adult|bust/i);
  });
  it('検索：日本語・英語・別名で品質と仕上げのタグが見つかる', () => {
    expect(searchTags(DETAIL_VIEW_TAGS, '虹彩').map((t) => t.prompt)).toContain('detailed irises');
    expect(searchTags(DETAIL_VIEW_TAGS, 'hair').length).toBeGreaterThanOrEqual(7);
    expect(searchTags(QUALITY_TAGS, 'absundres').map((t) => t.prompt)).toEqual(['absurdres']);
  });
});

describe('3層の出力', () => {
  const w = mix([['ligne claire', 1], ['clean lineart', 1.2], ['flat color', 1]], [['amazing quality', 1.5], ['very aesthetic', 1.4]], [['detailed irises', 1.4], ['fine hair strands', 1.3], ['skin sheen', 0.8]]);
  it('19. 3層を統合（NovelAIは品質を末尾、PIXAIは先頭）', () => {
    expect(out(w, 'nai_v5').combined).toBe('ligne claire, 1.2::clean lineart ::, flat color, 1.4::detailed irises ::, 1.3::fine hair strands ::, 0.8::skin sheen ::, 1.5::amazing quality ::, 1.4::very aesthetic ::');
    expect(out(w, 'pixai_sdxl').combined).toBe('(amazing quality:1.5), (very aesthetic:1.4), ligne claire, (clean lineart:1.2), flat color, (detailed irises:1.4), (fine hair strands:1.3), (skin sheen:0.8)');
    expect(out(w, 'nai_v5', { qualityPosition: 'start' }).combined.startsWith('1.5::amazing quality ::')).toBe(true);
    expect(out(w, 'pixai_sdxl', { qualityPosition: 'end' }).combined.endsWith('(very aesthetic:1.4)')).toBe(true);
    expect(layerOrder('nai_v45')).toEqual(['style', 'detail', 'quality']);
    expect(layerOrder('pixai_tsubaki2')).toEqual(['quality', 'style', 'detail']);
  });
  it('20. 各層を個別に取り出せる', () => {
    const r = out(w, 'nai_v5');
    expect(r.style).toBe('ligne claire, 1.2::clean lineart ::, flat color');
    expect(r.quality).toBe('1.5::amazing quality ::, 1.4::very aesthetic ::');
    expect(r.detail).toBe('1.4::detailed irises ::, 1.3::fine hair strands ::, 0.8::skin sheen ::');
    // カテゴリ別も出力順（画風 → 仕上げ → 品質）に並ぶ
    const layers = r.byCategory.map((c) => c.layer);
    expect(layers.indexOf('detail')).toBeGreaterThan(layers.lastIndexOf('style'));
    expect(layers.indexOf('quality')).toBeGreaterThan(layers.lastIndexOf('detail'));
  });
  it('人物プロンプトは3層の結合に付く', () => {
    expect(out(w, 'nai_v5', { personPrompt: '1boy', personPosition: 'before' }).full.startsWith('1boy, ligne claire')).toBe(true);
  });
  it('3. 品質と仕上げの両方で選んだタグは1回だけ（採用規則に従う）', () => {
    let x = mix([], [['high detail', 1.2]], [['high detail', 1.4], ['fine details', 1]]);
    let r = out(x, 'nai_v5');
    expect((r.combined.match(/high detail/g) ?? []).length).toBe(1);
    expect(r.quality).toBe('1.2::high detail ::'); // 上（品質）を優先
    x = { ...x, dedupeRule: 'max' };
    r = out(x, 'nai_v5');
    expect(r.detail).toBe('1.4::high detail ::, fine details'); // 最大値なら仕上げ側の値・位置
    expect(r.quality).toBe('');
  });
  it('24. 品質・仕上げが空なら v1.1 と同じ出力（画風プリセット36件 × 7モデル）', () => {
    for (const p of PRESETS) {
      const s = applyPreset(emptyWorkspace(), p, 'replace');
      for (const prof of PROFILE_IDS) {
        const r = out(s, prof);
        expect(r.combined).toBe(r.style);
        expect(r.full).toBe(r.style);
      }
    }
  });
  it('プリセットは他の層を消さない', () => {
    let x = mix([['bloom', 1]], [['best quality', 1]], [['skin sheen', 0.8]]);
    x = applyPreset(x, PRESETS[0], 'replace');
    expect(x.quality).toHaveLength(1);
    expect(x.detail).toHaveLength(1);
    x = applyToLayer(x, 'detail', DETAIL_PRESETS[0].items.map((i) => ({ ...i, on: true })), 'replace');
    expect(x.quality).toHaveLength(1);
    expect(x.groups[0].items.length).toBe(PRESETS[0].items.length);
    // 追加時の重複は加算しない
    const m = applyToLayer(mix([], [], [['detailed irises', 0.5]]), 'detail', [{ tagId: id('detailed irises'), strength: 1.2, on: true }], 'merge', 'keepCurrent');
    expect(m.detail).toEqual([{ tagId: id('detailed irises'), strength: 0.5, on: true }]);
  });
  it('25. リセットは3層・年・複雑度を空にし、元の値は残る（元に戻す用）', () => {
    const r = resetMix({ ...w, complexity: 'high', years: [{ year: 2024, strength: 1, on: true }] });
    expect(isMixEmpty(r)).toBe(true);
    expect(r.quality).toEqual([]);
    expect(r.detail).toEqual([]);
    expect(w.quality).toHaveLength(2);
    expect(countAll(w)).toBe(8);
  });
});

describe('保存・互換性', () => {
  it('21/22. 3層のレシピを保存・JSONバックアップ・完全復元', () => {
    const w = mix([['bloom', 1.2]], [['best quality', 1.1]], [['detailed irises', 1.4]]);
    const recipe: Recipe = { id: 'r1', name: '3層', note: '', createdAt: '2026-10-24T00:00:00.000Z', updatedAt: '2026-10-24T00:00:00.000Z', groups: w.groups, dedupeRule: 'first', profile: 'nai_v5', years: [], complexity: null, quality: w.quality, detail: w.detail };
    const state = { ...initialState(), workspace: w, recipes: [recipe], groups: [{ id: 'g1', name: '瞳', createdAt: recipe.createdAt, updatedAt: recipe.updatedAt, items: w.detail, layer: 'detail' as const }] };
    const back = restoreFromBackup(JSON.stringify(exportBackup(state)));
    expect(back.state.recipes[0].quality).toEqual(w.quality);
    expect(back.state.recipes[0].detail).toEqual(w.detail);
    expect(back.state.groups[0].layer).toBe('detail');
    expect(back.state.workspace).toEqual(w);
    const imp = importIntoState(initialState(), JSON.stringify(exportBackup(state)), (c) => new Set(buildIndex(c).byId.keys()));
    expect(imp.unknownTagIds).toEqual([]);
    expect(imp.state.recipes[0].detail).toEqual(w.detail);
    // 再読み込み相当
    expect(migrateState(JSON.parse(JSON.stringify(state))).state).toEqual(state);
  });
  it('23. v1.0 の保存データを読み込める（品質・仕上げは未選択で補う）', () => {
    const m = migrateState(JSON.parse(fixture('v1.0-localstorage.json')));
    expect(m.warnings).toEqual([]);
    expect(m.state.schemaVersion).toBe(3);
    expect(m.state.workspace.quality).toEqual([]);
    expect(m.state.recipes[0].detail).toEqual([]);
    expect(m.state.groups.every((g) => g.layer === 'style')).toBe(true);
    expect(m.state.settings.naiAutoQuality).toBe('unknown');
  });
  it('23/24. v1.1 の保存データを読み込め、v1.1 と同じプロンプトを出力する', () => {
    const raw = JSON.parse(fixture('v1.1-localstorage.json'));
    const exp = JSON.parse(fixture('v1.1-expected.json'));
    expect(raw.schemaVersion).toBe(2);
    const m = migrateState(raw);
    expect(m.warnings).toEqual([]);
    const r = m.state.recipes[0];
    expect(r.years).toEqual([{ year: 2024, strength: 1.5, on: true }]);
    expect(r.complexity).toBe('high');
    expect(r.quality).toEqual([]);
    expect(m.state.customTags.map((c) => c.prompt)).toEqual(['thin brown colored outlines']);
    expect(m.state.groups[0]).toMatchObject({ name: 'v1.1の画風グループ', layer: 'style' });
    const idx = buildIndex(m.state.customTags);
    const w: Workspace = { groups: r.groups, activeGroupId: r.groups[0].id, dedupeRule: r.dedupeRule, sourceRecipeId: r.id, years: r.years, complexity: r.complexity, quality: r.quality, detail: r.detail };
    expect(out(w, 'nai_v5', {}, idx).full).toBe(exp.nai_v5);
    expect(out(w, 'pixai_sdxl', {}, idx).full).toBe(exp.pixai_sdxl);
  });
  it('v1.1 のJSONバックアップを追加・完全復元できる', () => {
    const t = fixture('v1.1-backup.json');
    const add = importIntoState(initialState(), t, (c) => new Set(buildIndex(c).byId.keys()));
    expect(add.added).toEqual({ recipes: 1, groups: 1, customTags: 1 });
    expect(add.unknownTagIds).toEqual([]);
    expect(restoreFromBackup(t).state.recipes[0].name).toBe('v1.1のレシピ');
  });
  it('未知のタグIDが品質・仕上げにあっても削除せず警告', () => {
    const e = { app: 'style-blending-workshop', kind: 'recipe', schemaVersion: 3, recipe: { name: 'x', groups: [], quality: [{ tagId: 'QLT-ZZZ-999', strength: 1 }], detail: [{ tagId: 'DTL-EYE-002', strength: 1.2 }] } };
    const r = importIntoState(initialState(), JSON.stringify(e), (c) => new Set(buildIndex(c).byId.keys()));
    expect(r.unknownTagIds).toEqual(['QLT-ZZZ-999']);
    expect(r.state.recipes[0].quality).toHaveLength(1);
    expect(r.state.recipes[0].detail[0].strength).toBe(1.2);
  });
  it('新しい版（schemaVersion 4）は読み込まない', () => {
    expect(migrateState({ ...initialState(), schemaVersion: 4 }).futureVersion).toBe(true);
  });
});

describe('性能', () => {
  it('27. 全タグを選んだ状態でも変換は十分速い', () => {
    let w = emptyWorkspace();
    for (const t of DICTIONARY_TAGS) w = setItem(w, w.activeGroupId, t.id, { strength: 1.2 });
    for (const t of QUALITY_TAGS) w = setLayerItem(w, 'quality', t.id, { strength: 1.1 });
    for (const t of DETAIL_TAGS) w = setLayerItem(w, 'detail', t.id, { strength: 0.9 });
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) for (const p of PROFILE_IDS) out(w, p);
    const per = (performance.now() - t0) / (20 * PROFILE_IDS.length);
    expect(per).toBeLessThan(15);
  });
});
