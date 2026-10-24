import { describe, expect, it } from 'vitest';
import {
  DICTIONARY_TAGS,
  ORIGINAL_RULES,
  PRESETS,
  RAW_TAGS,
  RULES,
  buildIndex,
  normalizeForSearch,
  searchTags,
} from '../src/core/dictionary';
import {
  activeGroup,
  addGroup,
  applyPreset,
  effectiveItems,
  emptyWorkspace,
  presetDuplicates,
  setItem,
  shiftGroup,
  toggleItem,
  type EffectiveItem,
} from '../src/core/mix';
import { evaluateRelations, relationCounts } from '../src/core/relations';
import { fmt, naiV3Layers, renderPrompt, renderTag, tsubakiBin } from '../src/core/render';
import { DEFAULT_SETTINGS } from '../src/core/schema';
import { CATEGORY_KEYS, PROFILE_IDS, type ProfileId, type Workspace } from '../src/core/types';

const index = buildIndex([]);
const S = (profile: ProfileId, extra: Partial<typeof DEFAULT_SETTINGS> = {}) => ({ ...DEFAULT_SETTINGS, profile, ...extra });
const idOf = (prompt: string) => DICTIONARY_TAGS.find((t) => t.prompt === prompt)!.id;
const ORIGINAL = DICTIONARY_TAGS.filter((t) => t.id.startsWith('REC-'));

function ws(...pairs: [string, number][]): Workspace {
  let w = emptyWorkspace();
  const g = w.activeGroupId;
  for (const [p, s] of pairs) w = setItem(w, g, idOf(p), { strength: s });
  return w;
}
const out = (w: Workspace, profile: ProfileId, extra = {}) => renderPrompt(effectiveItems(w, index), S(profile, extra));

describe('1. 辞書の読み込み', () => {
  it('元の329件・9カテゴリ・ID一意（v1.1で追加分があっても欠けない）', () => {
    expect(RAW_TAGS).toHaveLength(329);
    expect(ORIGINAL).toHaveLength(329);
    expect(new Set(DICTIONARY_TAGS.map((t) => t.id)).size).toBe(DICTIONARY_TAGS.length);
    const counts = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, ORIGINAL.filter((t) => t.category === c).length]));
    expect(counts).toEqual({
      style_genre: 43, linework: 43, coloring_shading: 40, lighting: 44, shadow_contrast: 23,
      color_palette: 41, medium_texture: 43, optical_effects: 28, atmosphere_print: 24,
    });
  });
  it('元の329件は REC-* を維持し、追加分は NAI-* で衝突しない', () => {
    expect(RAW_TAGS.every((t) => /^REC-[A-Z]{3}-\d{3}$/.test(t.ID))).toBe(true);
    expect(DICTIONARY_TAGS.filter((t) => !t.id.startsWith('REC-')).every((t) => /^NAI-[A-Z]{3}-\d{3}$/.test(t.id))).toBe(true);
  });
});

describe('2. 基本表示（MVP_Core）', () => {
  it('72件', () => {
    expect(DICTIONARY_TAGS.filter((t) => t.mvpCore)).toHaveLength(72);
  });
});

describe('3/4/11. 同カテゴリ複数選択・独立スライダー・自動統合しない', () => {
  it('同じ線画カテゴリから4件を別々の値で保持し、すべて出力', () => {
    const w = ws(['delicate linework', 1.3], ['loose lineart', 0.8], ['expressive linework', 1.1], ['brown outlines', 1.2]);
    expect(activeGroup(w).items.map((i) => i.strength)).toEqual([1.3, 0.8, 1.1, 1.2]);
    const r = out(w, 'nai_v45');
    expect(r.style).toBe('1.3::delicate linework ::, 0.8::loose lineart ::, 1.1::expressive linework ::, 1.2::brown outlines ::');
  });
  it('一つのスライダー操作が他に影響しない', () => {
    let w = ws(['thin lineart', 1], ['clean lineart', 1]);
    w = setItem(w, w.activeGroupId, idOf('thin lineart'), { strength: 1.4 });
    const items = activeGroup(w).items;
    expect(items.find((i) => i.tagId === idOf('clean lineart'))!.strength).toBe(1);
    expect(items.find((i) => i.tagId === idOf('thin lineart'))!.strength).toBe(1.4);
  });
  it('類似タグ（cel shading と soft cel shading）を統合しない', () => {
    const r = out(ws(['cel shading', 1], ['soft cel shading', 1]), 'pixai_sdxl');
    expect(r.style).toBe('cel shading, soft cel shading');
  });
});

describe('5. OFF・0は出力しない', () => {
  it('OFFにしたタグは消え、値は保持される', () => {
    let w = ws(['bloom', 1.2], ['bokeh', 1]);
    w = toggleItem(w, w.activeGroupId, idOf('bloom'));
    expect(activeGroup(w).items.find((i) => i.tagId === idOf('bloom'))).toMatchObject({ on: false, strength: 1.2 });
    for (const p of PROFILE_IDS) expect(out(w, p).style).not.toMatch(/bloom/);
    w = toggleItem(w, w.activeGroupId, idOf('bloom'));
    expect(out(w, 'pixai_sdxl').style).toBe('(bloom:1.2), bokeh');
  });
  it('強度0はOFF扱い', () => {
    const w = ws(['bloom', 0], ['bokeh', 1]);
    for (const p of PROFILE_IDS) expect(out(w, p).style).not.toMatch(/bloom/);
  });
  it('無効化したグループは出力しない', () => {
    let w = ws(['bloom', 1]);
    w = { ...w, groups: w.groups.map((g) => ({ ...g, enabled: false })) };
    expect(out(w, 'nai_v5').style).toBe('');
  });
});

describe('6/14. モデル別構文', () => {
  const w = ws(['cel shading', 1], ['rim lighting', 1.3], ['film grain', 0.6]);
  it('PIXAI SDXL', () => expect(out(w, 'pixai_sdxl').style).toBe('cel shading, (rim lighting:1.3), (film grain:0.6)'));
  it('NAI V4 / V4.5 / V5', () => {
    for (const p of ['nai_v4', 'nai_v45', 'nai_v5'] as const)
      expect(out(w, p).style).toBe('cel shading, 1.3::rim lighting ::, 0.6::film grain ::');
  });
  it('Tsubaki（自然言語・既定）', () => {
    for (const p of ['pixai_tsubaki2', 'pixai_tsubaki3'] as const)
      expect(out(w, p).style).toBe('cel shading, pronounced rim lighting, subtle film grain');
  });
  it('Tsubaki 実験モード（数値）', () => {
    expect(out(w, 'pixai_tsubaki3', { tsubakiNumeric: true }).style).toBe('cel shading, (rim lighting:1.3), (film grain:0.6)');
  });
  it('NAI V3 は括弧近似で、:: を出さない', () => {
    const r = out(w, 'nai_v3').style;
    expect(r).toBe(`cel shading, ${'{'.repeat(5)}rim lighting${'}'.repeat(5)}, ${'['.repeat(10)}film grain${']'.repeat(10)}`);
    expect(r).not.toContain('::');
  });
  it('どのモデルでも数値構文以外の括弧を混ぜない（1.0は装飾なし）', () => {
    for (const p of PROFILE_IDS) expect(renderTag('cel shading', 1, p, { sdxlClamp: true, tsubakiNumeric: false }).text).toBe('cel shading');
  });
  it('Tsubaki 既定では数値・括弧を出さない', () => {
    for (let v = 0.1; v <= 1.6; v += 0.1) {
      const t = renderTag('bloom', Math.round(v * 10) / 10, 'pixai_tsubaki2', { sdxlClamp: true, tsubakiNumeric: false }).text;
      expect(t).not.toMatch(/[\d():{}[\]]/);
    }
  });
});

describe('強度の境界', () => {
  it('SDXL：1.6は既定で1.5に丸めて警告', () => {
    const r = out(ws(['bloom', 1.6]), 'pixai_sdxl');
    expect(r.style).toBe('(bloom:1.5)');
    expect(r.warnings.join()).toMatch(/1\.5/);
    expect(out(ws(['bloom', 1.6]), 'pixai_sdxl', { sdxlClamp: false }).style).toBe('(bloom:1.6)');
  });
  it('NAI：1.6はそのまま（上限は公式に明記なし）', () => {
    expect(out(ws(['bloom', 1.6]), 'nai_v5').style).toBe('1.6::bloom ::');
  });
  it('Tsubaki の段階：binRanges どおり', () => {
    const table: [number, string][] = [[0.1, 'subtle'], [0.6, 'subtle'], [0.7, 'gentle'], [0.8, 'gentle'], [0.9, 'plain'], [1.1, 'plain'], [1.2, 'pronounced'], [1.3, 'pronounced'], [1.4, 'intense'], [1.6, 'intense']];
    for (const [v, b] of table) expect(tsubakiBin(v)).toBe(b);
  });
  it('NAI V3：段数 = round(|ln w / ln 1.05|)', () => {
    expect(naiV3Layers(1.05)).toBe(1);
    expect(naiV3Layers(1.1)).toBe(2);
    expect(naiV3Layers(0.5)).toBe(14);
    expect(naiV3Layers(1.6)).toBe(10);
  });
  it('fmt は末尾の0を落とす', () => {
    expect(fmt(1.2)).toBe('1.2');
    expect(fmt(0.30000000000000004)).toBe('0.3');
  });
});

describe('7. 関係（競合警告）', () => {
  it('元データの関係は4種・53件のまま。v1.1は公式資料に根拠のある関係だけを追加', () => {
    expect(relationCounts(ORIGINAL_RULES)).toMatchObject({ exclusive: 7, conflict: 13, conditional: 14, synergy: 19, synonym: 0, similar: 0, complement: 0 });
    expect(ORIGINAL_RULES).toHaveLength(53);
    expect(relationCounts(RULES)).toMatchObject({ exclusive: 7, conflict: 13, conditional: 14, synergy: 22, synonym: 5, similar: 1, complement: 0 });
  });
  it('排他的：no lineart × thick lineart は強い警告、選択は残る', () => {
    const w = ws(['no lineart', 1], ['thick lineart', 1]);
    const eff = effectiveItems(w, index);
    const hits = evaluateRelations(new Set(eff.map((e) => e.tagId)));
    expect(hits[0]).toMatchObject({ type: 'exclusive', level: 'strong', bothActive: true });
    // 同カテゴリ内は調合順を保つ。どちらも消さない
    expect(renderPrompt(eff, S('pixai_sdxl')).style).toBe('no lineart, thick lineart');
  });
  it('競合・条件付き・相乗の区別', () => {
    const hitsOf = (...ps: string[]) => evaluateRelations(new Set(ps.map(idOf)));
    expect(hitsOf('flat color', 'gradient shading')[0]).toMatchObject({ type: 'conflict', level: 'warn' });
    expect(hitsOf('cel shading', 'painterly shading')[0]).toMatchObject({ type: 'conditional', level: 'info' });
    expect(hitsOf('backlighting', 'rim lighting')[0]).toMatchObject({ type: 'synergy', bothActive: true });
    // 片方だけ選択 → 相乗の提案
    expect(hitsOf('backlighting')[0]).toMatchObject({ type: 'synergy', bothActive: false, missing: idOf('rim lighting') });
    // 片方だけでは競合は出さない
    expect(hitsOf('flat color')).toEqual([]);
  });
  it('未定義の組合せは何も返さない', () => {
    expect(evaluateRelations(new Set([idOf('thin lineart'), idOf('delicate linework')]))).toEqual([]);
  });
});

describe('8. 36プリセット', () => {
  it('全件読み込め、全タグIDが辞書にあり、適用で値が反映される', () => {
    expect(PRESETS).toHaveLength(36);
    for (const p of PRESETS) {
      const w = applyPreset(emptyWorkspace(), p, 'replace');
      const items = activeGroup(w).items;
      expect(items.length).toBe(p.items.length);
      for (const pi of p.items) {
        expect(index.byId.has(pi.tagId)).toBe(true);
        expect(items.find((i) => i.tagId === pi.tagId)!.strength).toBe(pi.strength);
      }
    }
  });
  it('追加時、重複タグは無断で加算しない（現在値維持／プリセット値の選択）', () => {
    const p = PRESETS[0]; // REC-LIN-002 1.1 を含む
    let w = emptyWorkspace();
    w = setItem(w, w.activeGroupId, 'REC-LIN-002', { strength: 0.5 });
    expect(presetDuplicates(w, p)).toEqual([{ tagId: 'REC-LIN-002', current: 0.5, currentOn: true, preset: 1.1 }]);
    const keep = applyPreset(w, p, 'merge', 'keepCurrent');
    expect(activeGroup(keep).items.find((i) => i.tagId === 'REC-LIN-002')!.strength).toBe(0.5);
    const use = applyPreset(w, p, 'merge', 'usePreset');
    expect(activeGroup(use).items.find((i) => i.tagId === 'REC-LIN-002')!.strength).toBe(1.1);
    // どちらでも件数は重複なし
    expect(activeGroup(use).items.length).toBe(p.items.length);
  });
  it('置き換え前の状態は呼び出し元で保持される（純粋関数）', () => {
    const w = ws(['bloom', 1]);
    applyPreset(w, PRESETS[1], 'replace');
    expect(activeGroup(w).items).toHaveLength(1);
  });
});

describe('グループ調合と重複整理', () => {
  it('同一タグIDが複数グループにある場合の採用規則', () => {
    let w = ws(['thin lineart', 1.3]);
    w = addGroup(w, '線画B', [{ tagId: idOf('thin lineart'), strength: 0.7, on: true }, { tagId: idOf('loose lineart'), strength: 0.8, on: true }]);
    const pick = (rule: Workspace['dedupeRule']) => effectiveItems({ ...w, dedupeRule: rule }, index).find((e) => e.tagId === idOf('thin lineart'))!;
    expect(pick('first').strength).toBe(1.3);
    expect(pick('max').strength).toBe(1.3);
    expect(pick('min').strength).toBe(0.7);
    expect(pick('first').sources).toHaveLength(2);
    // 1回だけ出力される
    const s = renderPrompt(effectiveItems(w, index), S('pixai_sdxl')).style;
    expect(s.match(/thin lineart/g)).toHaveLength(1);
  });
  it('一括調整は個別値を変え、隠れ倍率を持たない（下限0.1・上限1.6で停止）', () => {
    let w = ws(['bloom', 1.55], ['bokeh', 0.1], ['glow', 1]);
    const r = shiftGroup(w, w.activeGroupId, 0.1);
    w = r.ws;
    expect(activeGroup(w).items.map((i) => i.strength)).toEqual([1.6, 0.2, 1.1]);
    expect(r.clamped).toEqual([idOf('bloom')]);
    const d = shiftGroup(ws(['bokeh', 0.1]), emptyWorkspace().activeGroupId, -0.1);
    expect(Object.keys(d.ws.groups[0])).toEqual(['id', 'name', 'enabled', 'items']); // 倍率フィールドなし
  });
  it('カテゴリ順に並べる（調合順も選べる）', () => {
    const w = ws(['film grain', 1], ['anime illustration', 1], ['cel shading', 1]);
    expect(out(w, 'pixai_sdxl').style).toBe('anime illustration, cel shading, film grain');
    const mix = renderPrompt(effectiveItems(w, index, 'mix'), S('pixai_sdxl')).style;
    expect(mix).toBe('film grain, anime illustration, cel shading');
  });
  it('カテゴリ別出力', () => {
    const r = out(ws(['film grain', 1], ['anime illustration', 1], ['bloom', 1.2]), 'nai_v5');
    expect(r.byCategory).toEqual([
      { category: 'style_genre', text: 'anime illustration', count: 1 },
      { category: 'optical_effects', text: 'film grain, 1.2::bloom ::', count: 2 },
    ]);
  });
});

describe('PIXAI 禁止語', () => {
  it('辞書・プリセットに adult / bust を含む表現がない', () => {
    for (const t of DICTIONARY_TAGS) expect(t.prompt.toLowerCase()).not.toMatch(/adult|bust/);
  });
  it('ユーザー定義タグに含まれれば PIXAI 出力から除外し、NAIでは出す', () => {
    const custom = [{ id: 'USR-x1', category: 'linework' as const, nameJa: 'テスト', prompt: 'robust lines', note: '', createdAt: '', updatedAt: '' }];
    const idx = buildIndex(custom);
    let w = emptyWorkspace();
    w = setItem(w, w.activeGroupId, 'USR-x1', { strength: 1 });
    for (const p of ['pixai_sdxl', 'pixai_tsubaki2', 'pixai_tsubaki3'] as const) {
      const r = renderPrompt(effectiveItems(w, idx), S(p));
      expect(r.style).toBe('');
      expect(r.warnings.join()).toMatch(/除外/);
    }
    expect(renderPrompt(effectiveItems(w, idx), S('nai_v5')).style).toBe('robust lines');
  });
  it('Tsubaki の修飾語自体に禁止語がない', () => {
    for (let v = 0.1; v <= 1.6; v += 0.1) {
      const t = renderTag('x', Math.round(v * 10) / 10, 'pixai_tsubaki3', { sdxlClamp: true, tsubakiNumeric: false }).text;
      expect(t).not.toMatch(/adult|bust/i);
    }
  });
});

describe('人物プロンプトとの結合', () => {
  it('前後の配置・余分なカンマの整理', () => {
    const w = ws(['bloom', 1]);
    expect(out(w, 'nai_v5', { personPrompt: '1boy, black hair, ' }).full).toBe('1boy, black hair, bloom');
    expect(out(w, 'nai_v5', { personPrompt: '1boy', personPosition: 'after' }).full).toBe('bloom, 1boy');
  });
});

describe('13. 未検証タグを検証済みと表示しない', () => {
  it('データ上の検証状態はすべて未実施', () => {
    expect(DICTIONARY_TAGS.every((t) => /未実施/.test(t.validationStatus))).toBe(true);
  });
});

describe('検索', () => {
  it('日本語・英語・ひらがな', () => {
    expect(searchTags(DICTIONARY_TAGS, 'rim').map((t) => t.prompt)).toContain('rim lighting');
    expect(searchTags(DICTIONARY_TAGS, 'セル塗り').map((t) => t.prompt)).toContain('cel shading');
    expect(searchTags(DICTIONARY_TAGS, 'りむらいと').map((t) => t.prompt)).toContain('rim lighting');
    expect(searchTags(DICTIONARY_TAGS, 'soft shad').map((t) => t.prompt)).toEqual(expect.arrayContaining(['soft shadows', 'soft shading']));
    expect(normalizeForSearch('ＲＩＭ　Light')).toBe('rimlight');
  });
});

describe('未知タグ', () => {
  it('辞書にないIDは出力から外し警告、データは保持', () => {
    let w = emptyWorkspace();
    w = setItem(w, w.activeGroupId, 'REC-XXX-999', { strength: 1 });
    w = setItem(w, w.activeGroupId, idOf('bloom'), { strength: 1 });
    const eff: EffectiveItem[] = effectiveItems(w, index);
    const r = renderPrompt(eff, S('nai_v5'));
    expect(r.style).toBe('bloom');
    expect(r.warnings.join()).toMatch(/辞書にない/);
    expect(activeGroup(w).items).toHaveLength(2);
  });
});
