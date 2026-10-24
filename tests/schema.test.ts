import { describe, expect, it } from 'vitest';
import { buildIndex } from '../src/core/dictionary';
import { applyPreset, emptyWorkspace, setItem } from '../src/core/mix';
import { PRESETS } from '../src/core/dictionary';
import {
  APP_ID,
  IMPORT_MAX_BYTES,
  exportBackup,
  exportGroup,
  exportRecipe,
  importIntoState,
  initialState,
  migrateState,
  restoreFromBackup,
  validateCustomPrompt,
} from '../src/core/schema';
import type { AppState, Recipe } from '../src/core/types';

const known = (c: AppState['customTags']) => new Set(buildIndex(c).byId.keys());

function sampleState(): AppState {
  const s = initialState();
  let w = applyPreset(emptyWorkspace(), PRESETS[3], 'replace');
  w = setItem(w, w.activeGroupId, 'USR-abc', { strength: 1.2 });
  const recipe: Recipe = {
    id: 'rcp-1', name: '繊細な茶色の線画', note: 'メモ', createdAt: '2026-10-24T00:00:00.000Z', updatedAt: '2026-10-24T00:00:00.000Z',
    groups: w.groups, dedupeRule: 'max', profile: 'nai_v45',
  };
  return {
    ...s,
    workspace: w,
    recipes: [recipe],
    groups: [{ id: 'sgp-1', name: '線画グループ', createdAt: recipe.createdAt, updatedAt: recipe.updatedAt, items: [{ tagId: 'REC-LIN-003', strength: 1.3, on: true }] }],
    customTags: [{ id: 'USR-abc', category: 'linework', nameJa: '繊細な細い線画', prompt: 'delicate thin lineart', note: '', createdAt: recipe.createdAt, updatedAt: recipe.updatedAt }],
  };
}

describe('9. 保存・復元（状態の往復）', () => {
  it('JSON化→復元で内容が変わらない', () => {
    const s = sampleState();
    const m = migrateState(JSON.parse(JSON.stringify(s)));
    expect(m.warnings).toEqual([]);
    expect(m.state).toEqual(s);
  });
  it('schemaVersion を持つ', () => {
    expect(JSON.parse(JSON.stringify(sampleState())).schemaVersion).toBe(1);
  });
  it('新しい版のデータは読み込まず、その旨を返す（上書き防止）', () => {
    const m = migrateState({ ...sampleState(), schemaVersion: 99 });
    expect(m.futureVersion).toBe(true);
  });
  it('壊れた項目は捨てずに警告', () => {
    const s = JSON.parse(JSON.stringify(sampleState()));
    s.recipes[0].groups[0].items.push({ tagId: 'REC-LIN-001', strength: 9 }, { foo: 1 });
    const m = migrateState(s);
    const items = m.state.recipes[0].groups[0].items;
    expect(items.find((i) => i.tagId === 'REC-LIN-001')!.strength).toBe(1.6);
    expect(m.warnings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('10. JSONエクスポート・インポート', () => {
  it('バックアップ → 空の状態へインポートで全件追加', () => {
    const s = sampleState();
    const text = JSON.stringify(exportBackup(s));
    const r = importIntoState(initialState(), text, known);
    expect(r.added).toEqual({ recipes: 1, groups: 1, customTags: 1 });
    expect(r.state.recipes[0].groups).toEqual(s.recipes[0].groups);
    expect(r.unknownTagIds).toEqual([]);
  });
  it('同じIDのレシピは上書きせず、別IDで追加', () => {
    const s = sampleState();
    const r = importIntoState(s, JSON.stringify(exportRecipe(s.recipes[0], s.customTags)), known);
    expect(r.state.recipes).toHaveLength(2);
    expect(r.state.recipes[0]).toEqual(s.recipes[0]);
    expect(r.state.recipes[1].id).not.toBe('rcp-1');
    expect(r.state.recipes[1].name).toMatch(/インポート/);
  });
  it('レシピ単体の書き出しには使用中のユーザー定義タグが同梱される', () => {
    const s = sampleState();
    const e = exportRecipe(s.recipes[0], s.customTags);
    expect(e.app).toBe(APP_ID);
    expect(e.customTags.map((c) => c.id)).toEqual(['USR-abc']);
    const g = exportGroup(s.groups[0], s.customTags);
    expect(g.customTags).toEqual([]);
  });
  it('不明なタグIDは削除せず保持し、警告', () => {
    const s = sampleState();
    const e = exportRecipe(s.recipes[0], []); // ユーザー定義タグを同梱しない → 不明扱い
    const r = importIntoState(initialState(), JSON.stringify(e), known);
    expect(r.unknownTagIds).toEqual(['USR-abc']);
    expect(r.state.recipes[0].groups[0].items.some((i) => i.tagId === 'USR-abc')).toBe(true);
    expect(r.warnings.join()).toMatch(/辞書にないタグID/);
  });
  it('ユーザー定義タグのID衝突（内容違い）は新IDに付け替え、参照も追従', () => {
    const s = sampleState();
    const other = { ...s, customTags: [{ ...s.customTags[0], prompt: 'something else' }] };
    const text = JSON.stringify(exportRecipe(s.recipes[0], s.customTags));
    const r = importIntoState(other, text, known);
    const newTag = r.state.customTags.find((c) => c.prompt === 'delicate thin lineart')!;
    expect(newTag.id).not.toBe('USR-abc');
    const imported = r.state.recipes[r.state.recipes.length - 1];
    expect(imported.groups[0].items.some((i) => i.tagId === newTag.id)).toBe(true);
  });
  it('不正なファイルは拒否（形式・他アプリ・将来版・サイズ）', () => {
    const s = initialState();
    expect(() => importIntoState(s, '{not json', known)).toThrow(/JSON/);
    expect(() => importIntoState(s, JSON.stringify({ app: 'other' }), known)).toThrow(/このアプリ/);
    expect(() => importIntoState(s, JSON.stringify({ app: APP_ID, kind: 'backup', schemaVersion: 5 }), known)).toThrow(/新しい版/);
    expect(() => importIntoState(s, 'x'.repeat(IMPORT_MAX_BYTES + 1), known)).toThrow(/大きすぎ/);
    expect(() => importIntoState(s, JSON.stringify({ foo: 1 }), known)).toThrow();
  });
  it('HTMLを含む名前は文字列として保持（描画時にエスケープ）・制御文字除去', () => {
    const e = { app: APP_ID, kind: 'recipe', schemaVersion: 1, recipe: { name: '<img src=x onerror=alert(1)>\u0007', groups: [] } };
    const r = importIntoState(initialState(), JSON.stringify(e), known);
    expect(r.state.recipes[0].name).toBe('<img src=x onerror=alert(1)>');
  });
  it('単純形式（items 直下・modelProfile）も読める', () => {
    const e = { schemaVersion: 1, recipe: { name: 'simple', modelProfile: 'nai_v5', items: [{ tagId: 'REC-COL-012', strength: 1.2 }] } };
    const r = importIntoState(initialState(), JSON.stringify(e), known);
    expect(r.state.recipes[0].profile).toBe('nai_v5');
    expect(r.state.recipes[0].groups[0].items).toEqual([{ tagId: 'REC-COL-012', strength: 1.2, on: true }]);
  });
  it('完全復元', () => {
    const s = sampleState();
    const r = restoreFromBackup(JSON.stringify(exportBackup(s)));
    expect(r.state.recipes).toEqual(s.recipes);
    expect(r.state.workspace).toEqual(s.workspace);
    expect(() => restoreFromBackup(JSON.stringify(exportRecipe(s.recipes[0], [])))).toThrow(/全体バックアップ/);
  });
});

describe('ユーザー定義タグの検査', () => {
  it('構文記号・辞書重複・空を拒否', () => {
    expect(validateCustomPrompt('delicate thin lineart')).toBeNull();
    expect(validateCustomPrompt('thin brown colored outlines')).toBeNull();
    expect(validateCustomPrompt('(x:1.2)')).not.toBeNull();
    expect(validateCustomPrompt('a::b')).not.toBeNull();
    expect(validateCustomPrompt('{x}')).not.toBeNull();
    expect(validateCustomPrompt('cel shading')).toMatch(/辞書/);
    expect(validateCustomPrompt('  ')).not.toBeNull();
    expect(validateCustomPrompt('a,')).not.toBeNull();
  });
});
