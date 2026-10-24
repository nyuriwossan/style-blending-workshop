// ───────────────────────────────────────────────
// データ辞書層：JSONを読み込み、正規化・索引化・検索する
// 辞書レコードの内容は書き換えない（読み取り専用）
// ───────────────────────────────────────────────
import tagsJson from '../../data/style_tags.json';
import naiTagsJson from '../../data/style_tags_nai_official.json';
import reconJson from '../../data/nai_official_reconciliation.json';
import naiRulesJson from '../../data/relation_rules_nai.json';
import presetsJson from '../../data/style_presets.json';
import rulesJson from '../../data/conflict_rules.json';
import modelRulesJson from '../../data/model_output_rules.json';
import metaJson from '../../data/app_meta.json';
import qualityJson from '../../data/quality_tags.json';
import detailJson from '../../data/detail_tags.json';
import layerRulesJson from '../../data/layer_relations.json';
import qualityPresetsJson from '../../data/quality_presets.json';
import detailPresetsJson from '../../data/detail_presets.json';
import layerReconJson from '../../data/layer_reconciliation.json';
import {
  CATEGORY_KEYS,
  DETAIL_CATEGORY_KEYS,
  PROFILE_IDS,
  QUALITY_CATEGORY_KEYS,
  type CategoryKey,
  type DetailCategory,
  type DetailType,
  type Layer,
  type QualityCategory,
  type RiskLevel,
  type TagCategory,
  type Complexity,
  type CustomTag,
  type OfficialInfo,
  type ProfileId,
  type SupportStatus,
  type RawPreset,
  type RawRule,
  type RawStyleTag,
  type Tag,
} from './types';

/** 再構築版の元辞書（329件・未改変） */
export const RAW_TAGS = (tagsJson as { tags: RawStyleTag[] }).tags;
/** v1.1：NovelAI公式掲載タグの追加分 */
export const RAW_NAI_TAGS = (naiTagsJson as unknown as { tags: RawStyleTag[] }).tags;
export const DICTIONARY_INFO = {
  schemaVersion: (tagsJson as { schemaVersion: number }).schemaVersion,
  reconstruction: (tagsJson as { reconstruction: string }).reconstruction,
  originalDatasetRecovered: (tagsJson as { originalDatasetRecovered: boolean }).originalDatasetRecovered,
  note: (tagsJson as { note: string }).note,
};
export const PRESETS = (presetsJson as { presets: RawPreset[] }).presets;
/** 再構築版の関係ルール（53件・未改変） */
export const ORIGINAL_RULES = (rulesJson as { rules: RawRule[] }).rules;
/** v1.1：公式資料に根拠のある関係（代替表現・表記揺れ・公式の組み合わせ提案） */
export const NAI_RULES = (naiRulesJson as { rules: RawRule[] }).rules;
/** 画風の関係（v1.1 まで） */
export const STYLE_RULES: RawRule[] = [...ORIGINAL_RULES, ...NAI_RULES];
/** v1.2：品質・仕上げディテールの関係（公式の尺度の反対側・表記揺れ・改称） */
export const LAYER_RULES = (layerRulesJson as { rules: RawRule[] }).rules;
export const RULES: RawRule[] = [...STYLE_RULES, ...LAYER_RULES];

export interface ReconEntry {
  officialTag: string;
  page: string;
  section: string;
  status: 'exact' | 'added' | 'special_ui' | 'excluded' | 'duplicate_listing';
  existingId?: string;
  newId?: string;
  similarExisting?: string[];
  reason?: string;
  note?: string;
  ui?: string;
}
export const RECON = reconJson as {
  checkedAt: string;
  sources: { title: string; url: string }[];
  note: string;
  officialExactExistingIds: string[];
  complexity: { tags: string[]; url: string; checkedAt: string; supportedProfiles: ProfileId[]; officialNoteJA: string };
  year: { format: string; url: string; urlArt: string; checkedAt: string; officialNoteJA: string };
  entries: ReconEntry[];
};
export const MODEL_RULES = modelRulesJson as {
  slider: { min: number; max: number; default: number; semantic: string };
  profiles: Record<string, Record<string, unknown>>;
  important: string;
};
export const META = metaJson as {
  categories: { key: CategoryKey; label: string; short: string; color: string }[];
  subcategories: Record<string, string>;
  evidenceLevels: Record<string, { label: string; detail: string }>;
  relationTypes: Record<string, { label: string; level: 'info' | 'suggest' | 'warn' | 'strong' }>;
  profiles: {
    id: ProfileId;
    label: string;
    short: string;
    family: 'pixai' | 'nai';
    statusKey: 'pixai_sdxl' | 'tsubaki2' | 'tsubaki3' | 'nai';
    experimental?: boolean;
  }[];
  tsubakiModifiers: Record<'subtle' | 'gentle' | 'plain' | 'pronounced' | 'intense', string>;
  pixaiBannedSubstrings: string[];
  basicViewExtraIds: { ids: string[] };
  complexityLevels: { key: Complexity; label: string; tag: string }[];
  yearRange: { min: number; max: number; maxItems: number };
  supportLabels: Record<SupportStatus, string>;
  layers: { key: Layer; label: string; short: string; note: string }[];
};

// ── v1.2：品質調合・仕上げディテールの辞書 ──
export interface RawLayerTag {
  ID: string;
  Layer: 'quality' | 'detail';
  Layers: Layer[];
  Category: string;
  Name_JA: string;
  Prompt: string;
  Description_JA: string;
  Source_Class: string;
  Source_Class_Label: string;
  Model_Support: Record<ProfileId, SupportStatus>;
  Evidence: { source: string; url: string; note: string }[];
  Aliases: string[];
  Quick?: boolean;
  Detail_Category?: DetailCategory | null;
  Detail_Basic?: boolean;
  Detail_Type?: DetailType;
  Risk?: RiskLevel;
  Risk_Note?: string;
  Adds_Elements?: boolean;
  NL_Template?: string | null;
  Caution_JA?: string | null;
  Validation_Status: string;
  NAI_Tag_Knowledge: string;
  Checked_At: string;
}
type LayerCat = { key: string; label: string; short: string; color: string; note?: string };
export const QUALITY_DATA = qualityJson as unknown as {
  checkedAt: string;
  sourceClasses: Record<string, string>;
  categories: LayerCat[];
  quickIds: string[];
  tags: RawLayerTag[];
};
export const DETAIL_DATA = detailJson as unknown as {
  checkedAt: string;
  sourceClasses: Record<string, string>;
  riskLevels: Record<RiskLevel, { label: string; detail: string }>;
  detailTypes: Record<DetailType, string>;
  categories: LayerCat[];
  tsubakiModifiers: Record<'subtle' | 'gentle' | 'plain' | 'pronounced' | 'intense', string>;
  sharedFromQuality: { ref: string; detailCategory: DetailCategory; basic: boolean }[];
  tags: RawLayerTag[];
};
export interface LayerPreset {
  id: string;
  kind: 'manual' | 'clear' | 'auto_setting';
  name_ja: string;
  description_ja: string;
  items: { tagId: string; strength: number }[];
  recommended_profiles?: ProfileId[];
  autoSetting?: 'off' | 'light' | 'standard';
}
export const QUALITY_PRESETS = (qualityPresetsJson as unknown as { presets: LayerPreset[] }).presets;
export const QUALITY_AUTO_PRESETS = (qualityPresetsJson as unknown as { autoSettingPresets: LayerPreset[] }).autoSettingPresets;
export const DETAIL_PRESETS = (detailPresetsJson as unknown as { presets: LayerPreset[] }).presets;
export const LAYER_RECON = layerReconJson as unknown as {
  checkedAt: string;
  naiAutoQuality: {
    url: string;
    checkedAt: string;
    position: string;
    note: string;
    models: Record<string, Record<string, string[]>>;
  };
  excluded: { tag: string; layer: string; reason: string }[];
  qualityCandidates: { tag: string; status: string; id: string }[];
  detailCandidatesFromReportB: { tag: string; status: string; id: string }[];
  additions: { tag: string; id: string; reason: string }[];
};

export const SLIDER = {
  min: MODEL_RULES.slider.min,
  max: MODEL_RULES.slider.max,
  step: 0.1,
  default: MODEL_RULES.slider.default,
};

/** 全層のカテゴリ順：画風 0〜、品質 100〜、仕上げ 200〜 */
export const CATEGORY_ORDER: Record<TagCategory, number> = Object.fromEntries([
  ...CATEGORY_KEYS.map((k, i) => [k, i]),
  ...QUALITY_CATEGORY_KEYS.map((k, i) => [k, 100 + i]),
  ...DETAIL_CATEGORY_KEYS.map((k, i) => [k, 200 + i]),
]) as Record<TagCategory, number>;
export const LAYER_ORDER: Record<Layer, number> = { quality: 0, style: 1, detail: 2 };
/** 全層のカテゴリ（調合皿の凡例などで使う順） */
export const ALL_CATEGORY_KEYS: TagCategory[] = [...QUALITY_CATEGORY_KEYS, ...CATEGORY_KEYS, ...DETAIL_CATEGORY_KEYS];

const ALL_CATEGORIES: { key: string; label: string; short: string; color: string; layer: Layer; note?: string }[] = [
  ...META.categories.map((c) => ({ ...c, layer: 'style' as Layer })),
  ...QUALITY_DATA.categories.map((c) => ({ ...c, layer: 'quality' as Layer })),
  ...DETAIL_DATA.categories.map((c) => ({ ...c, layer: 'detail' as Layer })),
];
export function categoryMeta(key: TagCategory) {
  return ALL_CATEGORIES.find((c) => c.key === key)!;
}
export function layerMeta(key: Layer) {
  return META.layers.find((l) => l.key === key)!;
}
export function profileMeta(id: ProfileId) {
  return META.profiles.find((p) => p.id === id)!;
}
export function subcategoryLabel(key: string) {
  return META.subcategories[key] ?? key;
}

// ── 検索用の正規化（NFKC・小文字・ひらがな→カタカナ・記号除去） ──
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s\-_・,、。.()（）]/g, '');
}

function isCategoryKey(x: string): x is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(x);
}

const allSupport = (st: SupportStatus) => Object.fromEntries(PROFILE_IDS.map((p) => [p, st])) as Record<ProfileId, SupportStatus>;
const NAI_PROFILES: ProfileId[] = ['nai_v3', 'nai_v4', 'nai_v45', 'nai_v5'];
const EXACT_EXISTING = new Set(RECON.officialExactExistingIds);
const BASIC_EXTRA = new Set(META.basicViewExtraIds.ids);

/** 既存タグのうち、公式ページで同一文字列が確認できたものの掲載情報（元レコードは変えない） */
function overlayOfficial(r: RawStyleTag): OfficialInfo | null {
  if (r.Official) return r.Official;
  if (!EXACT_EXISTING.has(r.ID)) return null;
  const e = RECON.entries.find((x) => x.status === 'exact' && x.existingId === r.ID);
  return { source: 'NovelAI', tag: e?.officialTag ?? r.Prompt, url: e?.page ?? '', section: e?.section ?? '', checkedAt: RECON.checkedAt };
}

export function normalizeRawTag(r: RawStyleTag): Tag {
  if (!isCategoryKey(r.Category)) throw new Error(`未知のカテゴリ: ${r.ID} ${r.Category}`);
  const official = overlayOfficial(r);
  const support = allSupport('unverified');
  if (official) for (const p of NAI_PROFILES) support[p] = 'official';
  if (r.Model_Support) Object.assign(support, r.Model_Support);
  const aliases = r.Aliases ?? [];
  return {
    id: r.ID,
    origin: 'dictionary',
    layer: 'style',
    layers: ['style'],
    category: r.Category,
    subcategory: r.Subcategory,
    nameJa: r.Name_JA,
    nameEn: r.Name_EN,
    prompt: r.Prompt,
    description: r.Description_JA,
    intendedEffect: r.Intended_Effect,
    evidenceLevel: r.Evidence_Level,
    sourceUrl: r.Source_URL,
    modelStatus: {
      pixai_sdxl: r.PIXAI_SDXL,
      tsubaki2: r.PIXAI_Tsubaki2,
      tsubaki3: r.PIXAI_Tsubaki3,
      nai: r.NAI,
    },
    faceImpact: r.Face_Impact,
    priority: r.Priority,
    mvpCore: r.MVP_Core === true,
    validationStatus: r.Validation_Status,
    aliases,
    official,
    support,
    v5Only: r.V5_Only === true,
    basic: r.MVP_Core === true || r.Basic_View === true || BASIC_EXTRA.has(r.ID),
    similarExisting: r.Similar_Existing ?? [],
    detailBasic: false,
    quick: false,
    addsElements: false,
    evidence: [],
    searchText: normalizeForSearch(
      [r.ID, r.Name_JA, r.Name_EN, r.Prompt, subcategoryLabel(r.Subcategory), ...aliases, official ? 'NAI公式 公式掲載' : ''].join('|'),
    ),
  };
}

export function customToTag(c: CustomTag): Tag {
  return {
    id: c.id,
    origin: 'user',
    layer: 'style',
    layers: ['style'],
    category: c.category,
    subcategory: 'user_defined',
    nameJa: c.nameJa || c.prompt,
    nameEn: c.prompt,
    prompt: c.prompt,
    description: c.note || 'ユーザー定義タグ。',
    intendedEffect: '（ユーザー定義・効果は未検証）',
    evidenceLevel: 'user_defined',
    sourceUrl: '',
    modelStatus: { pixai_sdxl: '未検証', tsubaki2: '未検証', tsubaki3: '未検証', nai: '未検証' },
    faceImpact: '不明',
    priority: '-',
    mvpCore: false,
    validationStatus: '画像生成による効果検証は未実施',
    aliases: [],
    official: null,
    support: allSupport('unverified'),
    v5Only: false,
    basic: true,
    similarExisting: [],
    detailBasic: false,
    quick: false,
    addsElements: false,
    evidence: [],
    searchText: normalizeForSearch([c.id, c.nameJa, c.prompt, 'ユーザー定義'].join('|')),
  };
}

/** 画風の辞書（元の329件 → 公式追加分の順）。v1.1 までと同じ範囲 */
export const DICTIONARY_TAGS: Tag[] = [...RAW_TAGS, ...RAW_NAI_TAGS].map(normalizeRawTag);

const SHARED_DETAIL = new Map(DETAIL_DATA.sharedFromQuality.map((x) => [x.ref, x]));
function isQualityCat(x: string): x is QualityCategory {
  return (QUALITY_CATEGORY_KEYS as readonly string[]).includes(x);
}
function isDetailCat(x: string): x is DetailCategory {
  return (DETAIL_CATEGORY_KEYS as readonly string[]).includes(x);
}

/** v1.2：品質・仕上げディテールのタグ（共有タグは1つのIDで、両方の層から選べる） */
export function normalizeLayerTag(r: RawLayerTag): Tag {
  const cat = r.Category;
  if (r.Layer === 'quality' ? !isQualityCat(cat) : !isDetailCat(cat)) throw new Error(`未知のカテゴリ: ${r.ID} ${cat}`);
  const shared = SHARED_DETAIL.get(r.ID);
  const detailCategory = r.Layer === 'detail' ? (cat as DetailCategory) : shared?.detailCategory;
  const support = { ...allSupport('unverified'), ...r.Model_Support };
  const sub = r.Layer === 'quality' ? QUALITY_DATA.categories.find((c) => c.key === cat)?.label : DETAIL_DATA.categories.find((c) => c.key === cat)?.label;
  return {
    id: r.ID,
    origin: 'dictionary',
    layer: r.Layer,
    layers: r.Layers,
    category: cat as TagCategory,
    subcategory: cat,
    nameJa: r.Name_JA,
    nameEn: r.Prompt,
    prompt: r.Prompt,
    description: r.Description_JA,
    intendedEffect: r.Caution_JA ? `注意：${r.Caution_JA}` : '',
    evidenceLevel: r.Source_Class,
    sourceUrl: r.Evidence.find((e) => e.url)?.url ?? '',
    modelStatus: { pixai_sdxl: '', tsubaki2: '', tsubaki3: '', nai: r.NAI_Tag_Knowledge },
    faceImpact: '',
    priority: '-',
    mvpCore: false,
    validationStatus: r.Validation_Status,
    aliases: r.Aliases ?? [],
    official: null,
    support,
    v5Only: false,
    basic: false,
    similarExisting: [],
    detailCategory: detailCategory ?? undefined,
    detailBasic: r.Layer === 'detail' ? r.Detail_Basic === true : shared?.basic === true,
    quick: r.Quick === true,
    risk: r.Risk,
    riskNote: r.Risk_Note,
    addsElements: r.Adds_Elements === true,
    detailType: r.Detail_Type,
    sourceClass: r.Source_Class,
    evidence: r.Evidence,
    nlTemplate: r.NL_Template ?? undefined,
    caution: r.Caution_JA ?? undefined,
    searchText: normalizeForSearch(
      [r.ID, r.Name_JA, r.Prompt, sub ?? '', ...(r.Aliases ?? []), r.Layer === 'quality' ? '品質' : '仕上げ ディテール', detailCategory ? DETAIL_DATA.categories.find((c) => c.key === detailCategory)?.label ?? '' : ''].join('|'),
    ),
  };
}
export const QUALITY_TAGS: Tag[] = QUALITY_DATA.tags.map(normalizeLayerTag);
export const DETAIL_TAGS: Tag[] = DETAIL_DATA.tags.map(normalizeLayerTag);
/** 仕上げディテール画面に並ぶタグ（専用44件＋品質と共有する3件） */
export const DETAIL_VIEW_TAGS: Tag[] = [...DETAIL_TAGS, ...QUALITY_TAGS.filter((t) => t.layers.includes('detail'))];
export const SOURCE_CLASS_LABELS = QUALITY_DATA.sourceClasses;
export const BASIC_COUNT = DICTIONARY_TAGS.filter((t) => t.basic).length;

/** この出力先でタグを出力できるか（公式に別モデル専用と明記されたものは出さない） */
export function isSupported(tag: Tag, profile: ProfileId): boolean {
  return tag.support[profile] !== 'unsupported';
}

/** 辞書タグ＋ユーザー定義タグの索引 */
export interface TagIndex {
  all: Tag[];
  byId: Map<string, Tag>;
}

export function buildIndex(customTags: CustomTag[]): TagIndex {
  const all = [...DICTIONARY_TAGS, ...QUALITY_TAGS, ...DETAIL_TAGS, ...customTags.map(customToTag)];
  const byId = new Map(all.map((t) => [t.id, t]));
  return { all, byId };
}

export function searchTags(tags: Tag[], query: string): Tag[] {
  const terms = query
    .split(/[\s　]+/)
    .map(normalizeForSearch)
    .filter(Boolean);
  if (terms.length === 0) return tags;
  return tags.filter((t) => terms.every((q) => t.searchText.includes(q)));
}

export function evidenceLabel(level: string) {
  return META.evidenceLevels[level] ?? { label: level, detail: '' };
}
