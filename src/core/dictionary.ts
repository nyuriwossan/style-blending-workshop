// ───────────────────────────────────────────────
// データ辞書層：JSONを読み込み、正規化・索引化・検索する
// 辞書レコードの内容は書き換えない（読み取り専用）
// ───────────────────────────────────────────────
import tagsJson from '../../data/style_tags.json';
import presetsJson from '../../data/style_presets.json';
import rulesJson from '../../data/conflict_rules.json';
import modelRulesJson from '../../data/model_output_rules.json';
import metaJson from '../../data/app_meta.json';
import {
  CATEGORY_KEYS,
  type CategoryKey,
  type CustomTag,
  type ProfileId,
  type RawPreset,
  type RawRule,
  type RawStyleTag,
  type Tag,
} from './types';

export const RAW_TAGS = (tagsJson as { tags: RawStyleTag[] }).tags;
export const DICTIONARY_INFO = {
  schemaVersion: (tagsJson as { schemaVersion: number }).schemaVersion,
  reconstruction: (tagsJson as { reconstruction: string }).reconstruction,
  originalDatasetRecovered: (tagsJson as { originalDatasetRecovered: boolean }).originalDatasetRecovered,
  note: (tagsJson as { note: string }).note,
};
export const PRESETS = (presetsJson as { presets: RawPreset[] }).presets;
export const RULES = (rulesJson as { rules: RawRule[] }).rules;
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
};

export const SLIDER = {
  min: MODEL_RULES.slider.min,
  max: MODEL_RULES.slider.max,
  step: 0.1,
  default: MODEL_RULES.slider.default,
};

export const CATEGORY_ORDER: Record<CategoryKey, number> = Object.fromEntries(
  CATEGORY_KEYS.map((k, i) => [k, i]),
) as Record<CategoryKey, number>;

export function categoryMeta(key: CategoryKey) {
  return META.categories.find((c) => c.key === key)!;
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

export function normalizeRawTag(r: RawStyleTag): Tag {
  if (!isCategoryKey(r.Category)) throw new Error(`未知のカテゴリ: ${r.ID} ${r.Category}`);
  return {
    id: r.ID,
    origin: 'dictionary',
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
    searchText: normalizeForSearch(
      [r.ID, r.Name_JA, r.Name_EN, r.Prompt, subcategoryLabel(r.Subcategory)].join('|'),
    ),
  };
}

export function customToTag(c: CustomTag): Tag {
  return {
    id: c.id,
    origin: 'user',
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
    searchText: normalizeForSearch([c.id, c.nameJa, c.prompt, 'ユーザー定義'].join('|')),
  };
}

export const DICTIONARY_TAGS: Tag[] = RAW_TAGS.map(normalizeRawTag);

/** 辞書タグ＋ユーザー定義タグの索引 */
export interface TagIndex {
  all: Tag[];
  byId: Map<string, Tag>;
}

export function buildIndex(customTags: CustomTag[]): TagIndex {
  const all = [...DICTIONARY_TAGS, ...customTags.map(customToTag)];
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
