// ───────────────────────────────────────────────
// サービス側の自動品質タグとの重複チェック
// アプリからサービスの設定は取得・変更できないので、利用者の自己申告をもとに「可能性」を知らせるだけ。
// アプリの出力からは何も削除しない。
// 根拠：NovelAI Docs「品質タグ追加の切替え」（data/layer_reconciliation.json の naiAutoQuality）
// ───────────────────────────────────────────────
import { LAYER_RECON, profileMeta } from './dictionary';
import type { NaiAutoQuality, ProfileId, Settings } from './types';

export interface AutoQualityInfo {
  /** サービスが自動で加えると分かっているタグ（不明なら null） */
  autoTags: string[] | null;
  /** 利用者が手動で選んだタグのうち、自動品質タグと重なるもの */
  overlaps: string[];
  /** 画面に出す短い説明 */
  status: string;
  /** 注意（重複・未確認など）。空なら表示しない */
  notes: string[];
}

const MODELS = LAYER_RECON.naiAutoQuality.models;

/** NovelAI の自動品質タグ（Full モデル）。V5 は Light/Standard、それ以外の版は ON の1種類 */
export function naiAutoTags(profile: ProfileId, setting: NaiAutoQuality): string[] | null {
  if (setting === 'unknown') return null;
  if (setting === 'off') return [];
  if (profile === 'nai_v5') {
    if (setting === 'light' || setting === 'standard') return MODELS.nai_v5[setting];
    return null; // V5 で「ON」とだけ分かっている場合は、どちらか不明
  }
  const m = MODELS[profile];
  return m?.on ?? null;
}

function splitTags(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function autoQualityInfo(
  settings: Pick<Settings, 'profile' | 'naiAutoQuality' | 'pixaiAutoQuality' | 'pixaiAutoQualityTags'>,
  selectedQualityPrompts: string[],
): AutoQualityInfo {
  const { profile } = settings;
  const selected = selectedQualityPrompts.map((p) => p.toLowerCase());
  const fam = profileMeta(profile).family;
  if (fam === 'nai') {
    const tags = naiAutoTags(profile, settings.naiAutoQuality);
    if (tags === null) {
      return {
        autoTags: null,
        overlaps: [],
        status: settings.naiAutoQuality === 'unknown' ? 'NovelAI側の「品質タグ追加」は未確認' : 'NovelAI V5 の「品質タグ追加」は Light か Standard かを選んでください',
        notes: selected.length ? ['NovelAI側でも品質タグが自動で追加されている可能性があります（設定が未確認のため、どのタグかは断定できません）'] : [],
      };
    }
    if (tags.length === 0) return { autoTags: [], overlaps: [], status: 'NovelAI側の「品質タグ追加」はOFF', notes: [] };
    const overlaps = selected.filter((p) => tags.includes(p));
    const curated = profile === 'nai_v45' || profile === 'nai_v4' ? '（Curated モデルでは内容が少し違います）' : '';
    return {
      autoTags: tags,
      overlaps,
      status: `NovelAI側が末尾に追加：${tags.join(', ')}${curated}`,
      notes: overlaps.length
        ? [`${overlaps.join('・')} は NovelAI 側でも自動追加される可能性があります。重ねて強調したい場合はそのままで構いません（アプリは削除しません）`]
        : [],
    };
  }
  // PIXAI：自動品質タグの内容はモデル依存で、公式に一覧がないため断定しない
  if (settings.pixaiAutoQuality === 'off') return { autoTags: [], overlaps: [], status: 'PIXAI側の品質タグ自動追加はOFF', notes: [] };
  if (settings.pixaiAutoQuality === 'on') {
    const tags = splitTags(settings.pixaiAutoQualityTags);
    if (tags.length === 0)
      return {
        autoTags: null,
        overlaps: [],
        status: 'PIXAI側の品質タグ自動追加はON（追加されるタグは未確認）',
        notes: selected.length ? ['PIXAI側でも品質タグが追加される可能性があります。どのタグかはモデルによって異なり、未確認です'] : [],
      };
    const overlaps = selected.filter((p) => tags.includes(p));
    return {
      autoTags: tags,
      overlaps,
      status: `PIXAI側で追加されるタグ（あなたの入力）：${tags.join(', ')}`,
      notes: overlaps.length ? [`${overlaps.join('・')} は PIXAI 側でも追加される可能性があります（アプリは削除しません）`] : [],
    };
  }
  return {
    autoTags: null,
    overlaps: [],
    status: 'PIXAI側の品質タグ自動追加は未確認',
    notes: [],
  };
}
