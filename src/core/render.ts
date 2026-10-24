// ───────────────────────────────────────────────
// 変換エンジン：実効タグリスト → モデル別プロンプト文字列
// 根拠：data/model_output_rules.json と NovelAI公式「Strengthening & Weakening」
// 強度の見た目上の等価性はモデル間で保証しない。
// ───────────────────────────────────────────────
import { type Complexity, type Layer, type ProfileId, type Settings, type Tag, type TagCategory, type YearItem } from './types';
import { CATEGORY_ORDER, DETAIL_DATA, META, MODEL_RULES, isSupported, profileMeta } from './dictionary';
import type { EffectiveItem } from './mix';

export const SDXL_MAX = Number((MODEL_RULES.profiles.pixai_sdxl as { defaultMax?: number }).defaultMax ?? 1.5);
const NAI_V3_FACTOR = 1.05;

export type Bin = 'subtle' | 'gentle' | 'plain' | 'pronounced' | 'intense';

/** 数値の表示形式：末尾の0を落とす（1.20→1.2、1.00→1） */
export function fmt(w: number): string {
  return String(Math.round(w * 100) / 100);
}

export function isStandard(w: number): boolean {
  return Math.abs(w - 1) < 1e-9;
}

/** Tsubaki用：model_output_rules.json の binRanges に従って段階を決める */
export function tsubakiBin(w: number, profile: 'pixai_tsubaki2' | 'pixai_tsubaki3' = 'pixai_tsubaki3'): Bin {
  const ranges = (MODEL_RULES.profiles[profile] as { binRanges: [number, number, Bin][] }).binRanges;
  const v = Math.round(w * 100) / 100;
  for (const [lo, hi, label] of ranges) if (v >= lo && v <= hi) return label;
  // 範囲の隙間（例 0.645）は丸めで発生しないが、念のため最も近い段階へ
  let best: Bin = 'plain';
  let dist = Infinity;
  for (const [lo, hi, label] of ranges) {
    const d = Math.min(Math.abs(v - lo), Math.abs(v - hi));
    if (d < dist) {
      dist = d;
      best = label;
    }
  }
  return best;
}

export function naiV3Layers(w: number): number {
  return Math.round(Math.abs(Math.log(w) / Math.log(NAI_V3_FACTOR)));
}

/** SD系の重み構文で ( ) が強調として解釈されないよう、タグ内の括弧をエスケープする（例：watercolor \\(medium\\)） */
export function escapeParens(p: string): string {
  return p.replace(/([()])/g, '\\$1');
}

export interface RenderOptions {
  sdxlClamp: boolean;
  tsubakiNumeric: boolean;
}

export interface RenderedTag {
  tagId: string;
  text: string;
  /** 出力から除外したか（禁止語など） */
  excluded: boolean;
  notes: string[];
}

export function isTsubaki(p: ProfileId): p is 'pixai_tsubaki2' | 'pixai_tsubaki3' {
  return p === 'pixai_tsubaki2' || p === 'pixai_tsubaki3';
}
export function isPixai(p: ProfileId): boolean {
  return profileMeta(p).family === 'pixai';
}

export function containsBanned(text: string): string[] {
  const lower = text.toLowerCase();
  return META.pixaiBannedSubstrings.filter((w) => lower.includes(w));
}

/** 1タグ分の変換。w は 0 < w ≤ 1.6 を想定（0は呼び出し前に除外済み） */
export function renderTag(prompt: string, w: number, profile: ProfileId, opt: RenderOptions): { text: string; notes: string[] } {
  const notes: string[] = [];
  const p = prompt.trim();
  switch (profile) {
    case 'pixai_sdxl': {
      let v = w;
      if (opt.sdxlClamp && v > SDXL_MAX) {
        notes.push(`${fmt(w)} は上限 ${fmt(SDXL_MAX)} に丸めました`);
        v = SDXL_MAX;
      }
      const e = escapeParens(p);
      return { text: isStandard(v) ? e : `(${e}:${fmt(v)})`, notes };
    }
    case 'pixai_tsubaki2':
    case 'pixai_tsubaki3': {
      if (opt.tsubakiNumeric) {
        const e = escapeParens(p);
        return { text: isStandard(w) ? e : `(${e}:${fmt(w)})`, notes };
      }
      const bin = tsubakiBin(w, profile);
      return { text: META.tsubakiModifiers[bin].replace('{p}', p), notes };
    }
    case 'nai_v4':
    case 'nai_v45':
    case 'nai_v5':
      return { text: isStandard(w) ? p : `${fmt(w)}::${p} ::`, notes };
    case 'nai_v3': {
      if (isStandard(w)) return { text: p, notes };
      const n = naiV3Layers(w);
      if (n === 0) return { text: p, notes };
      if (n > 6) notes.push(`括弧が${n}段になります（1.05倍の近似）`);
      return w > 1
        ? { text: `${'{'.repeat(n)}${p}${'}'.repeat(n)}`, notes }
        : { text: `${'['.repeat(n)}${p}${']'.repeat(n)}`, notes };
    }
  }
}

export interface RenderResult {
  /** 画風の層（年タグ・複雑度を含む）。v1.1 の style と同じ */
  style: string;
  /** v1.2：品質調合の層 */
  quality: string;
  /** v1.2：仕上げディテールの層 */
  detail: string;
  /** v1.2：3層をモデル別の順に結合（人物プロンプトなし） */
  combined: string;
  /** 結合の順序 */
  order: Layer[];
  /** 人物プロンプトと結合したもの（未入力なら combined と同じ） */
  full: string;
  byCategory: { category: TagCategory | 'special'; layer: Layer; text: string; count: number }[];
  tags: RenderedTag[];
  warnings: string[];
  /** 現在の出力先では出力しなかった項目（設定は保持） */
  unsupported: { tagIds: string[]; years: number; complexity: boolean };
}

export interface RenderExtras {
  years?: YearItem[];
  complexity?: Complexity | null;
}

export function complexityTag(c: Complexity): string {
  return `${c} complexity`;
}
export function yearTag(y: number): string {
  return `year ${y}`;
}

export const JOINER = ', ';

export type RenderSettings = Pick<Settings, 'profile' | 'sdxlClamp' | 'tsubakiNumeric' | 'personPrompt' | 'personPosition'> & {
  pixaiYears?: boolean;
  qualityPosition?: Settings['qualityPosition'];
  tsubakiDetailNL?: boolean;
};

/** 品質タグの位置：auto は PIXAI＝先頭（公式の定番の書き方）、NovelAI＝末尾（NovelAI の自動品質タグと同じ位置） */
export function layerOrder(profile: ProfileId, pos: Settings['qualityPosition'] = 'auto'): Layer[] {
  const start = pos === 'start' || (pos === 'auto' && isPixai(profile));
  return start ? ['quality', 'style', 'detail'] : ['style', 'detail', 'quality'];
}

/** Tsubaki 向けの仕上げディテール自然文（実験的）。{m} に強度の語を入れる */
export function detailNaturalText(template: string, w: number, profile: 'pixai_tsubaki2' | 'pixai_tsubaki3'): string {
  const m = DETAIL_DATA.tsubakiModifiers[tsubakiBin(w, profile)];
  return template.replace('{m}', m).replace(/\s+/g, ' ').trim();
}

/** 層ごとの1タグの変換 */
export function renderLayerTag(tag: Tag, w: number, layer: Layer, profile: ProfileId, s: RenderSettings): { text: string; notes: string[]; mode: 'tag' | 'plain' | 'nl' } {
  const opt: RenderOptions = { sdxlClamp: s.sdxlClamp, tsubakiNumeric: s.tsubakiNumeric };
  if (isTsubaki(profile) && !s.tsubakiNumeric) {
    if (layer === 'quality') return { text: tag.prompt, notes: [], mode: 'plain' };
    if (layer === 'detail' && s.tsubakiDetailNL !== false && tag.nlTemplate) return { text: detailNaturalText(tag.nlTemplate, w, profile), notes: [], mode: 'nl' };
  }
  const r = renderTag(tag.prompt, w, profile, opt);
  return { ...r, mode: 'tag' };
}

/** 実効リスト全体を変換する（v1.2：品質・画風・仕上げの3層） */
export function renderPrompt(items: EffectiveItem[], settings: RenderSettings, extras: RenderExtras = {}): RenderResult {
  const profile = settings.profile;
  const unsupported: RenderResult['unsupported'] = { tagIds: [], years: 0, complexity: false };
  let parenNoted = false;
  const warnings: string[] = [];
  const tags: RenderedTag[] = [];
  const blocks: Record<Layer, string[]> = { quality: [], style: [], detail: [] };
  const perCat = new Map<string, { layer: Layer; texts: string[] }>();
  const tsubakiQualityWeight: string[] = [];
  const unsupportedNames: string[] = [];
  let nlUsed = false;
  let unknown = 0;

  for (const it of items) {
    if (!(it.strength > 0)) continue; // OFF・0 は出力しない
    if (!it.tag) {
      unknown++;
      tags.push({ tagId: it.tagId, text: '', excluded: true, notes: ['辞書にないタグIDのため出力しません'] });
      continue;
    }
    if (!isSupported(it.tag, profile)) {
      unsupported.tagIds.push(it.tagId);
      unsupportedNames.push(it.tag.prompt);
      tags.push({ tagId: it.tagId, text: '', excluded: true, notes: ['この出力先には非対応（公式に対応モデルの記載あり）。設定は保持'] });
      continue;
    }
    if (isPixai(profile) && !parenNoted && /[()]/.test(it.tag.prompt)) {
      parenNoted = true;
      warnings.push('（medium）など括弧を含むNovelAI表記のタグがあります。PIXAIでの解釈は未確認です' + (profile === 'pixai_sdxl' || settings.tsubakiNumeric ? '（重み構文と衝突しないよう括弧を \\( \\) にしています）' : ''));
    }
    const r = renderLayerTag(it.tag, it.strength, it.layer, profile, settings);
    if (isPixai(profile)) {
      const hit = containsBanned(`${it.tag.prompt} ${r.text}`);
      if (hit.length) {
        tags.push({ tagId: it.tagId, text: '', excluded: true, notes: [`PIXAI向けでは「${hit.join('・')}」を含む表現を使わないため除外`] });
        warnings.push(`「${it.tag.prompt}」は PIXAI 向け出力から除外しました（${hit.join('・')} を含むため）`);
        continue;
      }
    }
    if (r.mode === 'plain' && !isStandard(it.strength)) tsubakiQualityWeight.push(it.tag.prompt);
    if (r.mode === 'nl') nlUsed = true;
    tags.push({ tagId: it.tagId, text: r.text, excluded: false, notes: r.notes });
    for (const n of r.notes) warnings.push(`${it.tag.nameJa}：${n}`);
    blocks[it.layer].push(r.text);
    const key = it.tag.category;
    const c = perCat.get(key) ?? { layer: it.layer, texts: [] };
    c.texts.push(r.text);
    perCat.set(key, c);
  }
  if (unknown) warnings.push(`辞書にないタグが ${unknown} 件あり、出力から外しています（データは保持）`);
  if (unsupported.tagIds.length)
    warnings.push(`この出力先に非対応のタグ ${unsupported.tagIds.length} 件（${unsupportedNames.join('、')}）は出力していません。公式資料で対応モデルが限られているものです（選択は保持し、対応するモデルに戻すと出力されます）`);
  if (tsubakiQualityWeight.length)
    warnings.push(`Tsubaki の自然言語方式では品質タグの強度を表現しないため、${tsubakiQualityWeight.join('・')} は強度なしで出力しています`);
  if (nlUsed) warnings.push('【実験的】仕上げディテールを Tsubaki 向けの自然文テンプレートで出力しています。効き方は未検証です（「出力の設定」で短いタグ形式に切り替えられます）');

  // ── 年タグ・複雑度（画風の層の末尾。v1.1 と同じ） ──
  const special: string[] = [];
  const years = (extras.years ?? []).filter((y) => y.on && y.strength > 0);
  if (years.length) {
    if (isPixai(profile) && !settings.pixaiYears) {
      unsupported.years = years.length;
      warnings.push(`年タグ ${years.length} 件は PIXAI 向けには出力していません（NovelAI公式のタグ。「出力の設定」で実験的に出力できます）`);
    } else {
      if (isPixai(profile)) warnings.push('【実験的】年タグを PIXAI 向けに出力しています。NovelAIと同じ効果になるかは未確認です');
      for (const y of years) {
        if (isTsubaki(profile) && !settings.tsubakiNumeric) {
          special.push(yearTag(y.year));
          if (!isStandard(y.strength)) warnings.push(`${yearTag(y.year)}：Tsubaki の自然言語方式では年タグの強度を表現しないため、強度なしで出力しています`);
        } else {
          const r = renderTag(yearTag(y.year), y.strength, profile, { sdxlClamp: settings.sdxlClamp, tsubakiNumeric: settings.tsubakiNumeric });
          special.push(r.text);
          for (const n of r.notes) warnings.push(`${yearTag(y.year)}：${n}`);
        }
      }
    }
  }
  if (extras.complexity) {
    if (profile === 'nai_v5') special.push(complexityTag(extras.complexity));
    else {
      unsupported.complexity = true;
      warnings.push(`複雑度（${complexityTag(extras.complexity)}）は NovelAI V5 専用のため出力していません（設定は保持）`);
    }
  }

  const style = [...blocks.style, ...special].join(JOINER);
  const quality = blocks.quality.join(JOINER);
  const detail = blocks.detail.join(JOINER);
  const order = layerOrder(profile, settings.qualityPosition);
  const texts: Record<Layer, string> = { quality, style, detail };
  const combined = order.map((l) => texts[l]).filter(Boolean).join(JOINER);

  const catKeys = [...perCat.keys()].sort((a, b) => CATEGORY_ORDER[a as TagCategory] - CATEGORY_ORDER[b as TagCategory]);
  const byCategory: RenderResult['byCategory'] = [];
  for (const l of order) {
    for (const k of catKeys) {
      const c = perCat.get(k)!;
      if (c.layer === l) byCategory.push({ category: k as TagCategory, layer: l, text: c.texts.join(JOINER), count: c.texts.length });
    }
    if (l === 'style' && special.length) byCategory.push({ category: 'special', layer: 'style', text: special.join(JOINER), count: special.length });
  }

  const person = settings.personPrompt.trim().replace(/[,\s]+$/, '').replace(/^[,\s]+/, '');
  if (person && isPixai(profile)) {
    const hit = containsBanned(person);
    if (hit.length)
      warnings.push(`人物プロンプトに「${hit.join('・')}」を含む語があります。PIXAI向けでは使わない方針なので、手で見直してください（自動では書き換えません）`);
  }
  let full = combined;
  if (person) {
    if (!combined) full = person;
    else full = settings.personPosition === 'before' ? `${person}${JOINER}${combined}` : `${combined}${JOINER}${person}`;
  }
  return { style, quality, detail, combined, order, full, byCategory, tags, warnings, unsupported };
}

/** 出力形式の説明（UI表示用） */
export function syntaxDescription(profile: ProfileId, opt: RenderOptions): string {
  switch (profile) {
    case 'pixai_sdxl':
      return `数値ウェイト (tag:1.2)。1.0は装飾なし。${opt.sdxlClamp ? `${fmt(SDXL_MAX)}を超える値は${fmt(SDXL_MAX)}に丸めます。` : '上限の丸めはOFFです。'}`;
    case 'pixai_tsubaki2':
    case 'pixai_tsubaki3':
      return opt.tsubakiNumeric
        ? '【実験モード】数値ウェイト (phrase:1.2)。公式の構文仕様・効き方は未確認です。'
        : '自然言語の段階表現（subtle / gentle / 無印 / pronounced / intense）。アプリ側の提案方式で、数値との換算は保証しません。ネガティブプロンプトは生成しません。';
    case 'nai_v4':
    case 'nai_v45':
    case 'nai_v5':
      return '数値強調 1.2::tag :: （公式仕様、V4以降）。1.0は装飾なし。';
    case 'nai_v3':
      return '【実験的】{ } / [ ] の段数で近似（1段=1.05倍、公式仕様）。V3は先頭に近いタグほど強く効くとされます。';
  }
}
