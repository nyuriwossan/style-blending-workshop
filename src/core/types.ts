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
  // ── v1.1 追加分（NovelAI公式掲載タグのみが持つ。既存329件にはない） ──
  Aliases?: string[];
  Official?: OfficialInfo;
  Model_Support?: Partial<Record<ProfileId, SupportStatus>>;
  Min_Version?: ProfileId | null;
  V5_Only?: boolean;
  Basic_View?: boolean;
  Similar_Existing?: string[];
}

/** 公式資料への掲載情報（＝画像での効果検証とは別の情報） */
export interface OfficialInfo {
  source: 'NovelAI';
  tag: string;
  url: string;
  urlJa?: string | null;
  section: string;
  checkedAt: string;
  officialSummaryJA?: string;
}

/**
 * モデル対応の状態
 * - official：公式資料に掲載（そのモデルでの使用が案内されている）
 * - unsupported：公式に別モデル専用と明記（このモデルには出力しない）
 * - unverified：公式の記載なし・効果未検証（出力はする）
 */
export type SupportStatus = 'official' | 'unsupported' | 'unverified';

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
  /** 検索用の別名（公式の代替表現・日本語の言い方など） */
  aliases: string[];
  /** NovelAI公式資料に同一文字列で掲載されているか（照合日つき） */
  official: OfficialInfo | null;
  /** モデル別の対応状態（記載のないモデルは unverified） */
  support: Record<ProfileId, SupportStatus>;
  v5Only: boolean;
  /** 基本表示に出すか */
  basic: boolean;
  similarExisting: string[];
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

/** NovelAI V5 の複雑度（排他選択。null＝指定なし） */
export const COMPLEXITY_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];

/** 年タグ（year 2024 形式） */
export interface YearItem {
  year: number;
  strength: number;
  on: boolean;
}
export type OrderRule = 'category' | 'mix';

export interface Workspace {
  groups: MixGroup[];
  activeGroupId: string;
  dedupeRule: DedupeRule;
  /** 編集元のレシピ（上書き保存用）。新規ならnull */
  sourceRecipeId: string | null;
  /** v1.1：年タグ（初期は空） */
  years: YearItem[];
  /** v1.1：複雑度（V5専用。null＝指定なし） */
  complexity: Complexity | null;
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
  /** v1.1 */
  years: YearItem[];
  complexity: Complexity | null;
  /** 読み込んだデータにあった未知の項目（無断で捨てずに保持し、書き出し時に戻す） */
  extra?: Record<string, unknown>;
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
  /** v1.1：NAI公式掲載タグだけを表示 */
  officialOnly: boolean;
  /** v1.1：PIXAIにも年タグを出力する実験モード（既定OFF） */
  pixaiYears: boolean;
}

export const SCHEMA_VERSION = 2 as const;

export interface AppState {
  schemaVersion: typeof SCHEMA_VERSION;
  workspace: Workspace;
  recipes: Recipe[];
  groups: SavedGroup[];
  customTags: CustomTag[];
  settings: Settings;
}
