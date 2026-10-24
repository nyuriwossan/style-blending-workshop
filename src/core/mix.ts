// ───────────────────────────────────────────────
// 調合ロジック：グループ操作、重複整理、プリセット適用
// すべて純粋関数（引数を書き換えず、新しい値を返す）
// ───────────────────────────────────────────────
import { CATEGORY_ORDER, SLIDER } from './dictionary';
import type {
  DedupeRule,
  MixGroup,
  MixItem,
  OrderRule,
  RawPreset,
  Tag,
  Workspace,
  Complexity,
  YearItem,
} from './types';
import type { TagIndex } from './dictionary';

export function newId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${rnd}`;
}

/** 強度を範囲内に収め、小数第2位で丸める（浮動小数の誤差対策） */
export function normalizeStrength(v: number): number {
  if (!Number.isFinite(v)) return SLIDER.default;
  const c = Math.min(SLIDER.max, Math.max(SLIDER.min, v));
  return Math.round(c * 100) / 100;
}

export function isActive(item: MixItem): boolean {
  return item.on && item.strength > 0;
}

export function emptyGroup(name = '調合グループ1'): MixGroup {
  return { id: newId('grp'), name, enabled: true, items: [] };
}

export function emptyWorkspace(): Workspace {
  const g = emptyGroup();
  return { groups: [g], activeGroupId: g.id, dedupeRule: 'first', sourceRecipeId: null, years: [], complexity: null };
}

/**
 * 調合のリセット（調合画面・出力画面の共通処理）
 * 空にするもの：グループ・タグ・年タグ・複雑度・編集中レシピの紐付け
 * 残すもの：重複の採用規則（出力設定の一部）。保存棚・自作タグ・出力先は Workspace の外にあるので触れない
 */
export function resetMix(ws: Workspace): Workspace {
  return { ...emptyWorkspace(), dedupeRule: ws.dedupeRule };
}

/** 調合が空か（タグ・年・複雑度のどれもない） */
export function isMixEmpty(ws: Workspace): boolean {
  return ws.groups.every((g) => g.items.length === 0) && ws.years.length === 0 && ws.complexity === null;
}

// ── 年タグ（year 2024 形式）──
export const YEAR_MIN = 1900;
export const YEAR_MAX = 2099;
export const YEAR_MAX_ITEMS = 10;

/** 入力された年の検査。問題なければ null */
export function validateYear(input: string, existing: YearItem[]): string | null {
  const t = input.normalize('NFKC').trim();
  if (!/^\d{4}$/.test(t)) return '西暦を4桁の数字で入力してください（例：2024）';
  const y = Number(t);
  if (y < YEAR_MIN || y > YEAR_MAX) return `${YEAR_MIN}〜${YEAR_MAX}年の範囲で入力してください`;
  if (existing.some((e) => e.year === y)) return `${y}年はすでに追加されています`;
  if (existing.length >= YEAR_MAX_ITEMS) return `年タグは${YEAR_MAX_ITEMS}件までです`;
  return null;
}

export function addYear(ws: Workspace, year: number, strength = SLIDER.default): Workspace {
  if (ws.years.some((y) => y.year === year)) return ws;
  return { ...ws, years: [...ws.years, { year, strength: normalizeStrength(strength), on: true }] };
}

export function setYear(ws: Workspace, year: number, patch: Partial<YearItem>): Workspace {
  return {
    ...ws,
    years: ws.years.map((y) => {
      if (y.year !== year) return y;
      const next = { ...y, ...patch, year: y.year };
      next.strength = normalizeStrength(next.strength);
      if (patch.strength !== undefined) next.on = next.strength > 0;
      if (patch.on === true && next.strength === 0) next.strength = SLIDER.default;
      return next;
    }),
  };
}

export function removeYear(ws: Workspace, year: number): Workspace {
  return { ...ws, years: ws.years.filter((y) => y.year !== year) };
}

export function setComplexity(ws: Workspace, c: Complexity | null): Workspace {
  return ws.complexity === c ? ws : { ...ws, complexity: c };
}

export function activeGroup(ws: Workspace): MixGroup {
  return ws.groups.find((g) => g.id === ws.activeGroupId) ?? ws.groups[0];
}

function mapGroup(ws: Workspace, groupId: string, fn: (g: MixGroup) => MixGroup): Workspace {
  return { ...ws, groups: ws.groups.map((g) => (g.id === groupId ? fn(g) : g)) };
}

// ── タグ単位の操作（同じカテゴリから何件でも選べる。類似タグを統合しない） ──

export function setItem(ws: Workspace, groupId: string, tagId: string, patch: Partial<MixItem>): Workspace {
  return mapGroup(ws, groupId, (g) => {
    const idx = g.items.findIndex((i) => i.tagId === tagId);
    if (idx === -1) {
      const item: MixItem = { tagId, strength: SLIDER.default, on: true, ...patch };
      item.strength = normalizeStrength(item.strength);
      if (item.strength === 0) item.on = false;
      return { ...g, items: [...g.items, item] };
    }
    const cur = g.items[idx];
    const next: MixItem = { ...cur, ...patch };
    next.strength = normalizeStrength(next.strength);
    // 0はOFFと同義
    if (patch.strength !== undefined && next.strength === 0) next.on = false;
    if (patch.strength !== undefined && next.strength > 0 && patch.on === undefined) next.on = true;
    // OFF→ONにした時、強度0なら標準値に戻す
    if (patch.on === true && next.strength === 0) next.strength = SLIDER.default;
    const items = g.items.slice();
    items[idx] = next;
    return { ...g, items };
  });
}

export function toggleItem(ws: Workspace, groupId: string, tagId: string): Workspace {
  const g = ws.groups.find((x) => x.id === groupId);
  const cur = g?.items.find((i) => i.tagId === tagId);
  if (!cur) return setItem(ws, groupId, tagId, { on: true, strength: SLIDER.default });
  return setItem(ws, groupId, tagId, { on: !isActive(cur) });
}

export function removeItem(ws: Workspace, groupId: string, tagId: string): Workspace {
  return mapGroup(ws, groupId, (g) => ({ ...g, items: g.items.filter((i) => i.tagId !== tagId) }));
}

/** グループ一括調整：各タグの値そのものを変える（隠れた倍率は持たない） */
export function shiftGroup(ws: Workspace, groupId: string, delta: number): { ws: Workspace; clamped: string[] } {
  const clamped: string[] = [];
  const next = mapGroup(ws, groupId, (g) => ({
    ...g,
    items: g.items.map((i) => {
      if (!isActive(i)) return i;
      const raw = Math.round((i.strength + delta) * 100) / 100;
      // 一括調整で勝手にOFFにはしない：下限0.1、上限1.6で止める
      const v = Math.min(SLIDER.max, Math.max(0.1, raw));
      if (v !== raw) clamped.push(i.tagId);
      return { ...i, strength: v };
    }),
  }));
  return { ws: next, clamped };
}

// ── グループ操作 ──

export function addGroup(ws: Workspace, name: string, items: MixItem[] = []): Workspace {
  const g: MixGroup = { id: newId('grp'), name, enabled: true, items: dedupeWithin(items) };
  return { ...ws, groups: [...ws.groups, g], activeGroupId: g.id };
}

export function renameGroup(ws: Workspace, groupId: string, name: string): Workspace {
  return mapGroup(ws, groupId, (g) => ({ ...g, name }));
}

export function setGroupEnabled(ws: Workspace, groupId: string, enabled: boolean): Workspace {
  return mapGroup(ws, groupId, (g) => ({ ...g, enabled }));
}

export function duplicateGroup(ws: Workspace, groupId: string): Workspace {
  const src = ws.groups.find((g) => g.id === groupId);
  if (!src) return ws;
  const copy: MixGroup = { ...src, id: newId('grp'), name: `${src.name}のコピー`, items: src.items.map((i) => ({ ...i })) };
  const idx = ws.groups.indexOf(src);
  const groups = ws.groups.slice();
  groups.splice(idx + 1, 0, copy);
  return { ...ws, groups, activeGroupId: copy.id };
}

export function deleteGroup(ws: Workspace, groupId: string): Workspace {
  const groups = ws.groups.filter((g) => g.id !== groupId);
  if (groups.length === 0) {
    const g = emptyGroup();
    return { ...ws, groups: [g], activeGroupId: g.id };
  }
  const activeGroupId = ws.activeGroupId === groupId ? groups[0].id : ws.activeGroupId;
  return { ...ws, groups, activeGroupId };
}

export function moveGroup(ws: Workspace, groupId: string, dir: -1 | 1): Workspace {
  const idx = ws.groups.findIndex((g) => g.id === groupId);
  const to = idx + dir;
  if (idx < 0 || to < 0 || to >= ws.groups.length) return ws;
  const groups = ws.groups.slice();
  [groups[idx], groups[to]] = [groups[to], groups[idx]];
  return { ...ws, groups };
}

/** 同一グループ内で同じタグIDが重複しないよう整理（最初の出現を残す） */
export function dedupeWithin(items: MixItem[]): MixItem[] {
  const seen = new Set<string>();
  const out: MixItem[] = [];
  for (const i of items) {
    if (seen.has(i.tagId)) continue;
    seen.add(i.tagId);
    out.push({ tagId: i.tagId, strength: normalizeStrength(i.strength), on: i.on !== false });
  }
  return out;
}

// ── 出力用の実効リスト（グループ間の重複整理） ──

export interface EffectiveSource {
  groupId: string;
  groupName: string;
  strength: number;
}
export interface EffectiveItem {
  tagId: string;
  tag: Tag | undefined;
  strength: number;
  /** 採用された値の出どころ */
  adoptedFrom: EffectiveSource;
  /** 同じタグIDを含む全グループ（2件以上なら重複） */
  sources: EffectiveSource[];
  /** 調合順（最初に出現した順番） */
  mixOrder: number;
}

export const DEDUPE_RULE_LABEL: Record<DedupeRule, string> = {
  first: '上のグループを優先',
  max: '最も強い値を採用',
  min: '最も弱い値を採用',
};

/**
 * 有効なグループ・ONのタグだけを集め、同一タグIDの重複を規則に従って1つにまとめる。
 * 意味の似た別タグ（別ID）は統合しない。値の加算もしない。
 */
export function effectiveItems(ws: Workspace, index: TagIndex, order: OrderRule = 'category'): EffectiveItem[] {
  const map = new Map<string, EffectiveItem>();
  let n = 0;
  for (const g of ws.groups) {
    if (!g.enabled) continue;
    for (const i of g.items) {
      if (!isActive(i)) continue;
      const src: EffectiveSource = { groupId: g.id, groupName: g.name, strength: i.strength };
      const cur = map.get(i.tagId);
      if (!cur) {
        map.set(i.tagId, {
          tagId: i.tagId,
          tag: index.byId.get(i.tagId),
          strength: i.strength,
          adoptedFrom: src,
          sources: [src],
          mixOrder: n++,
        });
        continue;
      }
      cur.sources.push(src);
      const take =
        (ws.dedupeRule === 'max' && i.strength > cur.strength) ||
        (ws.dedupeRule === 'min' && i.strength < cur.strength);
      if (take) {
        cur.strength = i.strength;
        cur.adoptedFrom = src;
      }
    }
  }
  const list = [...map.values()];
  if (order === 'category') {
    list.sort((a, b) => {
      const ca = a.tag ? CATEGORY_ORDER[a.tag.category] : 99;
      const cb = b.tag ? CATEGORY_ORDER[b.tag.category] : 99;
      return ca - cb || a.mixOrder - b.mixOrder;
    });
  }
  return list;
}

/** ワークスペース内の全タグIDのうち、辞書に存在しないもの */
export function unknownTagIds(ws: Workspace, index: TagIndex): string[] {
  const s = new Set<string>();
  for (const g of ws.groups) for (const i of g.items) if (!index.byId.has(i.tagId)) s.add(i.tagId);
  return [...s];
}

export function countActive(ws: Workspace): number {
  return new Set(ws.groups.filter((g) => g.enabled).flatMap((g) => g.items.filter(isActive).map((i) => i.tagId))).size;
}

// ── プリセット ──

export type PresetMode = 'replace' | 'merge' | 'newGroup';
export type DupPolicy = 'keepCurrent' | 'usePreset';

export interface PresetDuplicate {
  tagId: string;
  current: number;
  currentOn: boolean;
  preset: number;
}

export function presetItems(p: RawPreset): MixItem[] {
  return dedupeWithin(p.items.map((i) => ({ tagId: i.tagId, strength: i.strength, on: true })));
}

/** 編集中グループとプリセットの重複タグ */
export function presetDuplicates(ws: Workspace, p: RawPreset): PresetDuplicate[] {
  const g = activeGroup(ws);
  const out: PresetDuplicate[] = [];
  for (const pi of presetItems(p)) {
    const cur = g.items.find((i) => i.tagId === pi.tagId);
    if (cur) out.push({ tagId: pi.tagId, current: cur.strength, currentOn: cur.on, preset: pi.strength });
  }
  return out;
}

/**
 * プリセットを適用する。
 * - replace: 全グループをプリセット1グループに置き換える
 * - merge: 編集中グループに追加。重複タグは dupPolicy に従う（加算はしない）
 * - newGroup: 新しいグループとして追加（グループ間の重複は出力時の採用規則で整理）
 */
export function applyPreset(ws: Workspace, p: RawPreset, mode: PresetMode, dupPolicy: DupPolicy = 'keepCurrent'): Workspace {
  const items = presetItems(p);
  if (mode === 'replace') {
    const g: MixGroup = { id: newId('grp'), name: p.name_ja, enabled: true, items };
    return { ...ws, groups: [g], activeGroupId: g.id, sourceRecipeId: null };
  }
  if (mode === 'newGroup') return addGroup(ws, p.name_ja, items);
  const gid = activeGroup(ws).id;
  return mapGroup(ws, gid, (g) => {
    const next = g.items.slice();
    for (const pi of items) {
      const idx = next.findIndex((i) => i.tagId === pi.tagId);
      if (idx === -1) next.push(pi);
      else if (dupPolicy === 'usePreset') next[idx] = { ...pi };
    }
    return { ...g, items: next };
  });
}

/** 全ワークスペースから参照されるタグIDの一覧（ユーザー定義タグの使用確認用） */
export function referencedTagIds(groupsList: { items: MixItem[] }[]): Set<string> {
  const s = new Set<string>();
  for (const g of groupsList) for (const i of g.items) s.add(i.tagId);
  return s;
}
