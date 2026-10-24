// ───────────────────────────────────────────────
// 保存データのスキーマ：検証・移行・インポート用の正規化
// 方針：壊れた項目は捨てずに警告、不明なタグIDは保持して警告
// ───────────────────────────────────────────────
import { DICTIONARY_INFO, DICTIONARY_TAGS } from './dictionary';
import { dedupeWithin, emptyWorkspace, newId, normalizeStrength } from './mix';
import {
  CATEGORY_KEYS,
  PROFILE_IDS,
  SCHEMA_VERSION,
  type AppState,
  type CategoryKey,
  COMPLEXITY_LEVELS,
  type Complexity,
  type CustomTag,
  type YearItem,
  type DedupeRule,
  type MixGroup,
  type MixItem,
  type ProfileId,
  type Recipe,
  type SavedGroup,
  type Settings,
  type Workspace,
} from './types';

export const APP_ID = 'style-blending-workshop';
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_NAME = 80;
const MAX_NOTE = 1000;
const MAX_ITEMS = 500;
const MAX_LIST = 2000;

export const DEFAULT_SETTINGS: Settings = {
  profile: 'pixai_sdxl',
  view: 'basic',
  order: 'category',
  sdxlClamp: true,
  tsubakiNumeric: false,
  personPrompt: '',
  personPosition: 'before',
  officialOnly: false,
  pixaiYears: false,
};

export function initialState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    workspace: emptyWorkspace(),
    recipes: [],
    groups: [],
    customTags: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

// ── 小さな検証器 ──
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export function cleanText(x: unknown, max: number, fallback = ''): string {
  if (typeof x !== 'string') return fallback;
  return x.replace(CTRL, '').trim().slice(0, max);
}
const isoOr = (x: unknown) => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : new Date().toISOString());
const isProfile = (x: unknown): x is ProfileId => typeof x === 'string' && (PROFILE_IDS as readonly string[]).includes(x);
const isCategory = (x: unknown): x is CategoryKey => typeof x === 'string' && (CATEGORY_KEYS as readonly string[]).includes(x);
const isDedupe = (x: unknown): x is DedupeRule => x === 'first' || x === 'max' || x === 'min';
const TAG_ID_RE = /^[A-Za-z0-9_\-]{1,64}$/;

export interface Issues {
  warnings: string[];
}

export function parseItems(x: unknown, where: string, iss: Issues): MixItem[] {
  if (!Array.isArray(x)) {
    if (x !== undefined) iss.warnings.push(`${where}：タグ一覧の形式が不正なため空として読み込みました`);
    return [];
  }
  const out: MixItem[] = [];
  for (const raw of x.slice(0, MAX_ITEMS)) {
    if (!isObj(raw) || typeof raw.tagId !== 'string' || !TAG_ID_RE.test(raw.tagId)) {
      iss.warnings.push(`${where}：読み取れないタグ項目を1件スキップしました`);
      continue;
    }
    const s = typeof raw.strength === 'number' ? raw.strength : Number(raw.strength);
    if (!Number.isFinite(s)) {
      iss.warnings.push(`${where}：${raw.tagId} の強度が数値でないため 1.0 にしました`);
    } else if (s < 0 || s > 1.6) {
      iss.warnings.push(`${where}：${raw.tagId} の強度 ${s} を 0〜1.6 に収めました`);
    }
    out.push({ tagId: raw.tagId, strength: normalizeStrength(Number.isFinite(s) ? s : 1), on: raw.on !== false });
  }
  if (x.length > MAX_ITEMS) iss.warnings.push(`${where}：タグが多すぎるため先頭 ${MAX_ITEMS} 件のみ読み込みました`);
  const d = dedupeWithin(out);
  if (d.length !== out.length) iss.warnings.push(`${where}：同じグループ内の重複タグIDを1つにまとめました（最初の値を採用）`);
  return d;
}

export function parseGroup(x: unknown, where: string, iss: Issues): MixGroup | null {
  if (!isObj(x)) return null;
  return {
    id: typeof x.id === 'string' && x.id ? cleanText(x.id, 64) : newId('grp'),
    name: cleanText(x.name, MAX_NAME, '無名のグループ') || '無名のグループ',
    enabled: x.enabled !== false,
    items: parseItems(x.items, where, iss),
  };
}

export function parseGroups(x: unknown, where: string, iss: Issues): MixGroup[] {
  if (!Array.isArray(x)) return [];
  return x
    .slice(0, 50)
    .map((g, i) => parseGroup(g, `${where} グループ${i + 1}`, iss))
    .filter((g): g is MixGroup => !!g);
}

const isComplexity = (x: unknown): x is Complexity => typeof x === 'string' && (COMPLEXITY_LEVELS as readonly string[]).includes(x);

/** v1.1：年タグ。v1.0 のデータには無いので空配列になる */
export function parseYears(x: unknown, where: string, iss: Issues): YearItem[] {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x)) {
    iss.warnings.push(`${where}：年タグの形式が不正なため空として読み込みました`);
    return [];
  }
  const out: YearItem[] = [];
  for (const raw of x.slice(0, 20)) {
    const y = isObj(raw) ? Number(raw.year) : NaN;
    if (!Number.isInteger(y) || y < 1900 || y > 2099) {
      iss.warnings.push(`${where}：読み取れない年タグを1件スキップしました`);
      continue;
    }
    if (out.some((o) => o.year === y)) continue;
    const s = Number((raw as Record<string, unknown>).strength);
    out.push({ year: y, strength: normalizeStrength(Number.isFinite(s) ? s : 1), on: (raw as Record<string, unknown>).on !== false });
  }
  return out;
}
export function parseComplexity(x: unknown, where: string, iss: Issues): Complexity | null {
  if (x === undefined || x === null || x === '') return null;
  if (isComplexity(x)) return x;
  iss.warnings.push(`${where}：複雑度「${String(x).slice(0, 20)}」を読み取れないため「指定なし」にしました`);
  return null;
}

const RECIPE_KEYS = new Set(['id', 'name', 'note', 'createdAt', 'updatedAt', 'groups', 'items', 'dedupeRule', 'profile', 'modelProfile', 'years', 'complexity', 'extra']);

export function parseRecipe(x: unknown, iss: Issues): Recipe | null {
  if (!isObj(x)) return null;
  const name = cleanText(x.name, MAX_NAME, '無名のレシピ') || '無名のレシピ';
  let groups = parseGroups(x.groups, `レシピ「${name}」`, iss);
  // 旧形式・単純形式（items 直下）にも対応
  if (groups.length === 0 && Array.isArray(x.items)) {
    groups = [{ id: newId('grp'), name: '調合グループ1', enabled: true, items: parseItems(x.items, `レシピ「${name}」`, iss) }];
  }
  return {
    id: typeof x.id === 'string' && x.id ? cleanText(x.id, 64) : newId('rcp'),
    name,
    note: cleanText(x.note, MAX_NOTE),
    createdAt: isoOr(x.createdAt),
    updatedAt: isoOr(x.updatedAt),
    groups,
    dedupeRule: isDedupe(x.dedupeRule) ? x.dedupeRule : 'first',
    profile: isProfile(x.profile) ? x.profile : isProfile(x.modelProfile) ? x.modelProfile : DEFAULT_SETTINGS.profile,
    years: parseYears(x.years, `レシピ「${name}」`, iss),
    complexity: parseComplexity(x.complexity, `レシピ「${name}」`, iss),
    ...extraOf(x),
  };
}

/** 知らない項目は捨てずに extra へ退避（書き出し時もそのまま残る） */
function extraOf(x: Record<string, unknown>): { extra?: Record<string, unknown> } {
  const prev = isObj(x.extra) ? x.extra : {};
  const unknown = Object.fromEntries(Object.entries(x).filter(([k]) => !RECIPE_KEYS.has(k)));
  const merged = { ...prev, ...unknown };
  if (Object.keys(merged).length === 0) return {};
  const json = JSON.stringify(merged);
  return json.length <= 20000 ? { extra: merged } : {};
}

export function parseSavedGroup(x: unknown, iss: Issues): SavedGroup | null {
  if (!isObj(x)) return null;
  const name = cleanText(x.name, MAX_NAME, '無名のグループ') || '無名のグループ';
  return {
    id: typeof x.id === 'string' && x.id ? cleanText(x.id, 64) : newId('sgp'),
    name,
    createdAt: isoOr(x.createdAt),
    updatedAt: isoOr(x.updatedAt),
    items: parseItems(x.items, `グループ「${name}」`, iss),
  };
}

// ── ユーザー定義タグの検査 ──
/** 構文を壊す記号・改行は不可。( ) { } [ ] : \ < > */
export const CUSTOM_PROMPT_FORBIDDEN = /[(){}[\]:\\<>\n\r\t]/;
const DICT_PROMPTS = new Set(DICTIONARY_TAGS.map((t) => t.prompt.toLowerCase()));

/** 構文上の検査のみ（保存済みデータの読み込みに使う。辞書との重複では捨てない） */
export function validateCustomPromptSyntax(prompt: string): string | null {
  const p = prompt.trim();
  if (!p) return 'タグ文字列を入力してください';
  if (p.length > 100) return '100文字以内にしてください';
  if (CUSTOM_PROMPT_FORBIDDEN.test(p)) return '( ) { } [ ] : \\ < > と改行は、強調構文と衝突するため使えません';
  if (/^[,\s]|[,\s]$/.test(p)) return '先頭・末尾にカンマや空白は置けません';
  return null;
}

/** 新しく自作タグを作るときの検査（辞書と同じ文字列は作らせない） */
export function validateCustomPrompt(prompt: string): string | null {
  const e = validateCustomPromptSyntax(prompt);
  if (e) return e;
  if (DICT_PROMPTS.has(prompt.trim().toLowerCase())) return '同じ文字列が辞書にあります。辞書のタグを使ってください';
  return null;
}

export function dictionaryHasPrompt(prompt: string): boolean {
  return DICT_PROMPTS.has(prompt.trim().toLowerCase());
}

export function parseCustomTag(x: unknown, iss: Issues): CustomTag | null {
  if (!isObj(x)) return null;
  const prompt = cleanText(x.prompt, 100);
  const err = validateCustomPromptSyntax(prompt);
  if (err) {
    iss.warnings.push(`ユーザー定義タグ「${prompt || '(空)'}」を読み込めませんでした：${err}`);
    return null;
  }
  const id = typeof x.id === 'string' && /^USR-[A-Za-z0-9\-]{1,40}$/.test(x.id) ? x.id : newId('USR');
  return {
    id,
    category: isCategory(x.category) ? x.category : 'style_genre',
    nameJa: cleanText(x.nameJa, MAX_NAME),
    prompt,
    note: cleanText(x.note, MAX_NOTE),
    createdAt: isoOr(x.createdAt),
    updatedAt: isoOr(x.updatedAt),
  };
}

export function parseSettings(x: unknown): Settings {
  const s = isObj(x) ? x : {};
  return {
    profile: isProfile(s.profile) ? s.profile : DEFAULT_SETTINGS.profile,
    view: s.view === 'detail' ? 'detail' : 'basic',
    order: s.order === 'mix' ? 'mix' : 'category',
    sdxlClamp: s.sdxlClamp !== false,
    tsubakiNumeric: s.tsubakiNumeric === true,
    personPrompt: cleanText(s.personPrompt, 4000),
    personPosition: s.personPosition === 'after' ? 'after' : 'before',
    officialOnly: s.officialOnly === true,
    pixaiYears: s.pixaiYears === true,
  };
}

export function parseWorkspace(x: unknown, iss: Issues): Workspace {
  if (!isObj(x)) return emptyWorkspace();
  const groups = parseGroups(x.groups, '調合中', iss);
  const years = parseYears(x.years, '調合中', iss);
  const complexity = parseComplexity(x.complexity, '調合中', iss);
  if (groups.length === 0) return { ...emptyWorkspace(), years, complexity };
  const active = typeof x.activeGroupId === 'string' && groups.some((g) => g.id === x.activeGroupId) ? x.activeGroupId : groups[0].id;
  return {
    groups,
    activeGroupId: active,
    dedupeRule: isDedupe(x.dedupeRule) ? x.dedupeRule : 'first',
    sourceRecipeId: typeof x.sourceRecipeId === 'string' ? x.sourceRecipeId : null,
    years,
    complexity,
  };
}

/** 保存済み状態（localStorage）の復元。将来版のスキーマは読み込まない */
export function migrateState(raw: unknown): { state: AppState; warnings: string[]; futureVersion: boolean } {
  const iss: Issues = { warnings: [] };
  if (!isObj(raw)) return { state: initialState(), warnings: ['保存データの形式が不正です'], futureVersion: false };
  const v = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (v > SCHEMA_VERSION) {
    return { state: initialState(), warnings: [`新しい版のアプリで保存されたデータです（schemaVersion ${v}）`], futureVersion: true };
  }
  // v0（schemaVersion なし）・v1（v1.0）→ v2：
  // 構造は同じで、v2 で years・complexity・officialOnly・pixaiYears が増えただけ。無ければ初期値で補う
  const state: AppState = {
    schemaVersion: SCHEMA_VERSION,
    workspace: parseWorkspace(raw.workspace, iss),
    recipes: Array.isArray(raw.recipes) ? raw.recipes.slice(0, MAX_LIST).map((r) => parseRecipe(r, iss)).filter((r): r is Recipe => !!r) : [],
    groups: Array.isArray(raw.groups) ? raw.groups.slice(0, MAX_LIST).map((g) => parseSavedGroup(g, iss)).filter((g): g is SavedGroup => !!g) : [],
    customTags: Array.isArray(raw.customTags) ? raw.customTags.slice(0, MAX_LIST).map((c) => parseCustomTag(c, iss)).filter((c): c is CustomTag => !!c) : [],
    settings: parseSettings(raw.settings),
  };
  return { state, warnings: iss.warnings, futureVersion: false };
}

// ── エクスポート ──
export type ExportKind = 'backup' | 'recipe' | 'group';

function header(kind: ExportKind) {
  return {
    app: APP_ID,
    kind,
    schemaVersion: SCHEMA_VERSION,
    dictionary: DICTIONARY_INFO.reconstruction,
    exportedAt: new Date().toISOString(),
  };
}

function customTagsUsed(groups: { items: MixItem[] }[], all: CustomTag[]): CustomTag[] {
  const ids = new Set(groups.flatMap((g) => g.items.map((i) => i.tagId)));
  return all.filter((c) => ids.has(c.id));
}

export function exportBackup(state: AppState) {
  return { ...header('backup'), workspace: state.workspace, recipes: state.recipes, groups: state.groups, customTags: state.customTags, settings: state.settings };
}
export function exportRecipe(r: Recipe, customTags: CustomTag[]) {
  return { ...header('recipe'), recipe: r, customTags: customTagsUsed(r.groups, customTags) };
}
export function exportGroup(g: SavedGroup, customTags: CustomTag[]) {
  return { ...header('group'), group: g, customTags: customTagsUsed([g], customTags) };
}

// ── インポート（既存データに追加。上書きしない） ──
export interface ImportResult {
  state: AppState;
  added: { recipes: number; groups: number; customTags: number };
  warnings: string[];
  unknownTagIds: string[];
}

export function importIntoState(current: AppState, text: string, knownIds: (customTags: CustomTag[]) => Set<string>): ImportResult {
  if (new Blob([text]).size > IMPORT_MAX_BYTES) throw new Error(`ファイルが大きすぎます（上限 ${IMPORT_MAX_BYTES / 1024 / 1024}MB）`);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めませんでした');
  }
  if (!isObj(raw)) throw new Error('JSONの形式が不正です');
  if (raw.app !== undefined && raw.app !== APP_ID) throw new Error('このアプリのデータではありません');
  const v = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (v > SCHEMA_VERSION) throw new Error(`新しい版のアプリで書き出されたデータです（schemaVersion ${v}）。アプリを更新してから読み込んでください`);

  const iss: Issues = { warnings: [] };
  const kind = raw.kind ?? (raw.recipe ? 'recipe' : raw.group ? 'group' : raw.recipes || raw.groups ? 'backup' : 'unknown');

  let recipes: Recipe[] = [];
  let groups: SavedGroup[] = [];
  if (kind === 'backup') {
    recipes = Array.isArray(raw.recipes) ? raw.recipes.slice(0, MAX_LIST).map((r) => parseRecipe(r, iss)).filter((r): r is Recipe => !!r) : [];
    groups = Array.isArray(raw.groups) ? raw.groups.slice(0, MAX_LIST).map((g) => parseSavedGroup(g, iss)).filter((g): g is SavedGroup => !!g) : [];
  } else if (kind === 'recipe') {
    const r = parseRecipe(raw.recipe, iss);
    if (r) recipes = [r];
  } else if (kind === 'group') {
    const g = parseSavedGroup(raw.group, iss);
    if (g) groups = [g];
  } else {
    throw new Error('レシピ・グループ・バックアップのいずれの形式でもありません');
  }

  // ユーザー定義タグ：ID衝突時は内容が同じなら再利用、異なれば新IDへ付け替え
  const remap = new Map<string, string>();
  const customTags = current.customTags.slice();
  let addedCustom = 0;
  const incoming = Array.isArray(raw.customTags) ? raw.customTags.map((c) => parseCustomTag(c, iss)).filter((c): c is CustomTag => !!c) : [];
  for (const c of incoming) {
    const same = customTags.find((x) => x.id === c.id);
    if (same) {
      if (same.prompt === c.prompt && same.category === c.category) continue;
      const nid = newId('USR');
      remap.set(c.id, nid);
      customTags.push({ ...c, id: nid });
      addedCustom++;
      iss.warnings.push(`ユーザー定義タグ「${c.prompt}」はIDが重複していたため新しいIDで追加しました`);
      continue;
    }
    const samePrompt = customTags.find((x) => x.prompt.toLowerCase() === c.prompt.toLowerCase());
    if (samePrompt) {
      remap.set(c.id, samePrompt.id);
      continue;
    }
    customTags.push(c);
    addedCustom++;
  }
  const fix = (items: MixItem[]) => dedupeWithin(items.map((i) => (remap.has(i.tagId) ? { ...i, tagId: remap.get(i.tagId)! } : i)));

  // レシピ・グループ：ID衝突時は新IDで追加（既存を上書きしない）
  const rIds = new Set(current.recipes.map((r) => r.id));
  const gIds = new Set(current.groups.map((g) => g.id));
  recipes = recipes.map((r) => ({
    ...r,
    id: rIds.has(r.id) ? newId('rcp') : r.id,
    name: rIds.has(r.id) ? `${r.name}（インポート）` : r.name,
    groups: r.groups.map((g) => ({ ...g, items: fix(g.items) })),
  }));
  groups = groups.map((g) => ({
    ...g,
    id: gIds.has(g.id) ? newId('sgp') : g.id,
    name: gIds.has(g.id) ? `${g.name}（インポート）` : g.name,
    items: fix(g.items),
  }));

  const known = knownIds(customTags);
  const unknown = new Set<string>();
  for (const r of recipes) for (const g of r.groups) for (const i of g.items) if (!known.has(i.tagId)) unknown.add(i.tagId);
  for (const g of groups) for (const i of g.items) if (!known.has(i.tagId)) unknown.add(i.tagId);
  if (unknown.size)
    iss.warnings.push(`辞書にないタグID ${unknown.size} 件を含みます（${[...unknown].slice(0, 8).join(', ')}${unknown.size > 8 ? ' ほか' : ''}）。削除せず保持しますが、出力には含まれません`);

  return {
    state: {
      ...current,
      recipes: [...current.recipes, ...recipes],
      groups: [...current.groups, ...groups],
      customTags,
    },
    added: { recipes: recipes.length, groups: groups.length, customTags: addedCustom },
    warnings: iss.warnings,
    unknownTagIds: [...unknown],
  };
}

/** バックアップからの完全復元（置き換え）。呼び出し側で現在の状態を退避してから使う */
export function restoreFromBackup(text: string): { state: AppState; warnings: string[] } {
  if (new Blob([text]).size > IMPORT_MAX_BYTES) throw new Error(`ファイルが大きすぎます（上限 ${IMPORT_MAX_BYTES / 1024 / 1024}MB）`);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めませんでした');
  }
  if (!isObj(raw) || raw.app !== APP_ID || raw.kind !== 'backup') throw new Error('このアプリの「全体バックアップ」ファイルではありません');
  const m = migrateState(raw);
  if (m.futureVersion) throw new Error(m.warnings[0]);
  return { state: m.state, warnings: m.warnings };
}
