// タグ1件の行（画風・品質・仕上げディテールで共通）と強度スライダー
import { memo } from 'react';
import { DETAIL_DATA, META, SLIDER, SOURCE_CLASS_LABELS, evidenceLabel, isSupported, profileMeta } from '../core/dictionary';
import { isActive } from '../core/mix';
import { rulesForTag, type RelationHit } from '../core/relations';
import { detailNaturalText, isTsubaki } from '../core/render';
import { PROFILE_IDS, type MixItem, type ProfileId, type Tag } from '../core/types';

export type Occ = { groupId: string; groupName: string; strength: number; on: boolean; enabled: boolean };

// ── 強度スライダー（± ボタン付き。iPhoneで細かく合わせやすいように） ──
export function StrengthControl({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const step = (d: number) => onChange(Math.round(Math.min(SLIDER.max, Math.max(SLIDER.min, value + d)) * 10) / 10);
  return (
    <div className="strength">
      <button className="step" onClick={() => step(-SLIDER.step)} aria-label={`${label}を弱める`} disabled={value <= SLIDER.min}>
        −
      </button>
      <input
        type="range"
        min={SLIDER.min}
        max={SLIDER.max}
        step={SLIDER.step}
        value={value}
        aria-label={`${label}の強度`}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${(value / SLIDER.max) * 100}%` }}
      />
      <button className="step" onClick={() => step(SLIDER.step)} aria-label={`${label}を強める`} disabled={value >= SLIDER.max}>
        ＋
      </button>
      <output className={`strength-val ${value === 1 ? 'is-std' : ''}`}>{value === 0 ? 'OFF' : value.toFixed(1)}</output>
    </div>
  );
}

const SOURCE_BADGE: Record<string, string> = {
  nai_special: 'NAI公式',
  official_example: '公式例',
  official_phrase: '作例文',
  community_usage: '使用例',
  research_candidate: '候補',
};
export const RISK_LABEL: Record<string, string> = { low: '低', medium: '中', high: '高' };

export interface RowProps {
  tag: Tag;
  item: MixItem | undefined;
  others: Occ[];
  hits: RelationHit[];
  profile: ProfileId;
  expanded: boolean;
  onExpand: (id: string | null) => void;
  onToggle: (id: string) => void;
  onStrength: (id: string, v: number) => void;
  nameOf: (id: string) => string;
  /** 他の層でも選ばれているとき（例：品質調合でも選択中） */
  otherLayerNote?: string;
}

export const TagRow = memo(function TagRow({ tag, item, others, hits, profile, expanded, onExpand, onToggle, onStrength, nameOf, otherLayerNote }: RowProps) {
  const on = !!item && isActive(item);
  const pm = profileMeta(profile);
  const worst = hits.find((h) => h.level === 'strong') ?? hits.find((h) => h.level === 'warn');
  const isLayerTag = tag.layer !== 'style';
  return (
    <li id={tag.layer === 'style' ? `tag-${tag.id}` : undefined} className={`tag ${on ? 'tag-on' : ''}`} data-tag-id={tag.id}>
      <div className="tag-main">
        <button className="tag-toggle" aria-pressed={on} onClick={() => onToggle(tag.id)}>
          <span className="tag-check" aria-hidden />
          <span className="tag-names">
            <span className="tag-ja">
              {tag.nameJa}
              {tag.origin === 'user' && <span className="badge badge-user">自作</span>}
              {tag.official && <span className="badge badge-official">NAI公式</span>}
              {isLayerTag && tag.sourceClass && <span className={`badge badge-src badge-src-${tag.sourceClass}`}>{SOURCE_BADGE[tag.sourceClass]}</span>}
              {tag.v5Only && <span className="badge badge-v5">V5専用</span>}
              {tag.risk && tag.risk !== 'low' && <span className={`badge badge-risk badge-risk-${tag.risk}`}>外見リスク{RISK_LABEL[tag.risk]}</span>}
              {tag.addsElements && <span className="badge badge-adds">要素を追加</span>}
              {worst && <span className={`badge badge-${worst.level}`}>{worst.label}</span>}
            </span>
            <span className="tag-en" lang="en">{tag.prompt}</span>
          </span>
        </button>
        <button className="tag-info" aria-expanded={expanded} aria-label={`${tag.nameJa}の詳細`} onClick={() => onExpand(expanded ? null : tag.id)}>
          {expanded ? '閉' : '詳'}
        </button>
      </div>
      {on && <StrengthControl value={item!.strength} label={tag.nameJa} onChange={(v) => onStrength(tag.id, v)} />}
      {!on && item && item.strength > 0 && <p className="small muted tag-kept">OFF（値 {item.strength.toFixed(1)} を保持中）</p>}
      {on && !isSupported(tag, profile) && <p className="small note-warn tag-kept">現在の出力先（{pm.short}）では出力しません。選択は保持しています。</p>}
      {others.length > 0 && (
        <p className="small muted tag-others">
          他のグループにも：{others.map((o) => `${o.groupName} ${o.on ? o.strength.toFixed(1) : 'OFF'}${o.enabled ? '' : '（無効）'}`).join('、')}
        </p>
      )}
      {otherLayerNote && <p className="small muted tag-others">{otherLayerNote}</p>}
      {expanded && (isLayerTag ? <LayerDetail tag={tag} profile={profile} nameOf={nameOf} /> : <StyleDetail tag={tag} profile={profile} nameOf={nameOf} />)}
    </li>
  );
});

function SupportList({ tag, profile }: { tag: Tag; profile: ProfileId }) {
  return (
    <ul className="support-list">
      {PROFILE_IDS.map((p) => (
        <li key={p} className={p === profile ? 'is-current' : ''}>
          {profileMeta(p).short}：<span className={`sup sup-${tag.support[p]}`}>{META.supportLabels[tag.support[p]]}</span>
        </li>
      ))}
    </ul>
  );
}

function Relations({ tag, nameOf }: { tag: Tag; nameOf: (id: string) => string }) {
  const rules = rulesForTag(tag.id);
  if (!rules.length) return null;
  return (
    <div className="tag-rel">
      <p className="small muted">定義済みの関係</p>
      <ul>
        {rules.map((r) => {
          const other = r.tagIds.find((x) => x !== tag.id)!;
          return (
            <li key={r.id} className="small">
              {META.relationTypes[r.type]?.label}：{nameOf(other)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StyleDetail({ tag, profile, nameOf }: { tag: Tag; profile: ProfileId; nameOf: (id: string) => string }) {
  const pm = profileMeta(profile);
  const ev = evidenceLabel(tag.evidenceLevel);
  return (
    <div className="tag-detail">
      <p>{tag.description}</p>
      <dl>
        <dt>狙い</dt>
        <dd>{tag.intendedEffect}</dd>
        <dt>根拠</dt>
        <dd>
          {ev.label}
          <span className="muted">。{ev.detail}</span>
          {tag.sourceUrl && (
            <>
              {' '}
              <a href={tag.sourceUrl} target="_blank" rel="noopener noreferrer">参照資料</a>
            </>
          )}
        </dd>
        {tag.official && (
          <>
            <dt>公式掲載</dt>
            <dd>
              NovelAI公式「{tag.official.section}」に <code>{tag.official.tag}</code> として掲載（{tag.official.checkedAt} 照合）。{' '}
              <a href={tag.official.url} target="_blank" rel="noopener noreferrer">公式ページ</a>
              {tag.official.officialSummaryJA && <span className="muted"> 公式の説明：{tag.official.officialSummaryJA}</span>}
            </dd>
          </>
        )}
        <dt>モデル対応</dt>
        <dd>
          <SupportList tag={tag} profile={profile} />
        </dd>
        <dt>{pm.short}での状況</dt>
        <dd>{tag.modelStatus[pm.statusKey]}</dd>
        {tag.aliases.length > 0 && (
          <>
            <dt>別名・検索語</dt>
            <dd>{tag.aliases.join('、')}</dd>
          </>
        )}
        {tag.similarExisting.length > 0 && (
          <>
            <dt>似た既存タグ</dt>
            <dd>{tag.similarExisting.map(nameOf).join('、')}（統合せず別のタグとして残しています）</dd>
          </>
        )}
        <dt>画像での検証</dt>
        <dd>未実施（{tag.validationStatus}）</dd>
        <dt>顔への影響</dt>
        <dd>{tag.faceImpact}</dd>
        <dt>ID</dt>
        <dd className="mono-id">
          {tag.id}
          {tag.priority !== '-' && `（優先度 ${tag.priority}）`}
        </dd>
      </dl>
      <Relations tag={tag} nameOf={nameOf} />
    </div>
  );
}

function LayerDetail({ tag, profile, nameOf }: { tag: Tag; profile: ProfileId; nameOf: (id: string) => string }) {
  const nl = isTsubaki(profile) && tag.nlTemplate ? detailNaturalText(tag.nlTemplate, 1, profile as 'pixai_tsubaki2' | 'pixai_tsubaki3') : null;
  return (
    <div className="tag-detail">
      <p>{tag.description}</p>
      {tag.caution && <p className="note-warn small">注意：{tag.caution}</p>}
      <dl>
        <dt>出典区分</dt>
        <dd>{SOURCE_CLASS_LABELS[tag.sourceClass ?? ''] ?? tag.sourceClass}</dd>
        <dt>根拠</dt>
        <dd>
          <ul className="evidence-list">
            {tag.evidence.map((e, i) => (
              <li key={i}>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.source}
                  </a>
                ) : (
                  e.source
                )}
                <span className="muted">：{e.note}</span>
              </li>
            ))}
          </ul>
        </dd>
        <dt>モデル対応</dt>
        <dd>
          <SupportList tag={tag} profile={profile} />
        </dd>
        <dt>NAIのタグ知識</dt>
        <dd>{tag.modelStatus.nai}</dd>
        {tag.layers.includes('detail') && tag.risk && (
          <>
            <dt>外見変更リスク</dt>
            <dd>
              <b>{RISK_LABEL[tag.risk]}</b>（{DETAIL_DATA.riskLevels[tag.risk].detail}）。{tag.riskNote}
              <span className="muted"> 調査資料と本アプリの判断による暫定分類で、画像生成による実測ではありません。</span>
            </dd>
          </>
        )}
        {tag.addsElements && (
          <>
            <dt>要素の追加</dt>
            <dd>描き込み量の調整ではなく、新しい要素を描き足す可能性があります。</dd>
          </>
        )}
        {tag.detailType && (
          <>
            <dt>種類</dt>
            <dd>{DETAIL_DATA.detailTypes[tag.detailType]}</dd>
          </>
        )}
        {nl && (
          <>
            <dt>Tsubaki向け自然文</dt>
            <dd>
              <code>{nl}</code>
              <span className="muted">（実験的なテンプレート。強度に応じて先頭の語が変わります）</span>
            </dd>
          </>
        )}
        {tag.aliases.length > 0 && (
          <>
            <dt>別名・検索語</dt>
            <dd>{tag.aliases.join('、')}</dd>
          </>
        )}
        <dt>画像での検証</dt>
        <dd>未実施（{tag.validationStatus}）</dd>
        <dt>ID</dt>
        <dd className="mono-id">{tag.id}</dd>
      </dl>
      <Relations tag={tag} nameOf={nameOf} />
    </div>
  );
}
