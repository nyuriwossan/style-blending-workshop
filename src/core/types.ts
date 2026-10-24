// ───────────────────────────────────────────────
// 型定義：辞書（意味）・調合状態・保存データ
// 辞書の生レコードは data/*.json をそのまま使い、
// アプリ内部では正規化した Tag 型に変換して扱う。
// ───────────────────────────────────────────────

export const CATEGORY_KEYS = [
  'style_genre',
  'linework',
  'coloring_shading',
  'lighting',
  'shadow_contrast',
  'color_palette',
  'medium_texture',
  'optical_effects',
  'atmosphere_print',
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const PROFILE_IDS = [
  'pixai_sdxl',
  'pixai_tsubaki2',
  'pixai_tsubaki3',
  'nai_v4',
  'nai_v45',
  'nai_v5',
  'nai_v3',
] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

/** data/style_tags.json の1レコード（再構築版スキーマ v1） */
export interface RawStyleTag {
  ID: string;
  Original_ID: string | null;
  Category: string;
  Subcategory: string;
  Name_JA: string;
  Name_EN: string;
  Prompt: string;
  Description_JA: string;
  Intended_Effect: string;
  Evidence_Level: string;
  Source_URL: string;
  PIXAI_SDXL: string;
  PIXAI_Tsubaki2: string;
  PIXAI_Tsubaki3: string;
  NAI: string;
  Face_Impact: string;
  Conflicts: string[];
  Synergies: string[];
  Priority: string;
  MVP_Core: boolean;
  Validation_Status: string;
  Record_Provenance: string;
  Original_Metadata_Recovered: boolean;
}

export interface RawPreset {
  id: string;
  name_ja: string;
  name_en: string;
  description_ja: string;
  items: { tagId: string; strength: number }[];
  recommended_profiles: string[];
  expected_effect_ja: string;
  cautions_ja: string;
  origin: string;
}

export type RelationType =
  | 'synonym'
  | 'similar'
  | 'complement'
  | 'synergy'
  | 'conflict'
  | 'exclusive'
  | 'conditional';

export interface RawRule {
  id: string;
  type: RelationType;
  tagIds: string[];
  tagPrompts: string[];
  reason_JA: string;
  recommended_ui_action: string;
  evidence: string;
  source_url: string;
  origin: string;
}

/** アプリ内部で扱う正規化済みタグ（辞書タグとユーザー定義タグの共通形） */
export interface Tag {
  id: string;
  origin: 'dictionary' | 'user';
  category: CategoryKey;
  subcategory: string;
  nameJa: string;
  nameEn: string;
  prompt: string;
  description: string;
  intendedEffect: string;
  evidenceLevel: string;
  sourceUrl: string;
  modelStatus: { pixai_sdxl: string; tsubaki2: string; tsubaki3: string; nai: string };
  faceImpact: string;
  priority: string;
  mvpCore: boolean;
  validationStatus: string;
  /** 検索用の正規化済み文字列 */
  searchText: string;
}

/** ユーザー定義タグ（辞書外。常に未検証扱い） */
export interface CustomTag {
  id: string; // USR-xxxx
  category: CategoryKey;
  nameJa: string;
  prompt: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// ── 調合状態 ──

export interface MixItem {
  tagId: string;
  /** 0〜1.6。0はOFF扱い */
  strength: number;
  /** ON/OFFスイッチ。OFFでも強度値は保持する */
  on: boolean;
}

export interface MixGroup {
  id: string;
  name: string;
  /** グループ単位の有効/無効 */
  enabled: boolean;
  items: MixItem[];
}

/** 同一タグIDが複数グループにあるときの採用規則 */
export type DedupeRule = 'first' | 'max' | 'min';
export type OrderRule = 'category' | 'mix';

export interface Workspace {
  groups: MixGroup[];
  activeGroupId: string;
  dedupeRule: DedupeRule;
  /** 編集元のレシピ（上書き保存用）。新規ならnull */
  sourceRecipeId: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  groups: MixGroup[];
  dedupeRule: DedupeRule;
  profile: ProfileId;
}

export interface SavedGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: MixItem[];
}

export interface Settings {
  profile: ProfileId;
  view: 'basic' | 'detail';
  order: OrderRule;
  /** SDXLで1.5を超える値を1.5に丸める（既定ON） */
  sdxlClamp: boolean;
  /** Tsubaki系で数値ウェイトを使う実験モード（既定OFF） */
  tsubakiNumeric: boolean;
  personPrompt: string;
  personPosition: 'before' | 'after';
}

export const SCHEMA_VERSION = 1 as const;

export interface AppState {
  schemaVersion: typeof SCHEMA_VERSION;
  workspace: Workspace;
  recipes: Recipe[];
  groups: SavedGroup[];
  customTags: CustomTag[];
  settings: Settings;
}
