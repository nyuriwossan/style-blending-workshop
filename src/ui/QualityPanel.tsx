// 第2層｜品質調合：よく使うタグはチップで素早くON/OFF、詳細設定で全タグと個別強度
import { useMemo, useState } from 'react';
import { QUALITY_DATA, QUALITY_TAGS, isSupported, profileMeta } from '../core/dictionary';
import { autoQualityInfo } from '../core/autoQuality';
import { isActive, setLayerItem, shiftLayer, toggleLayerItem } from '../core/mix';
import type { RelationHit } from '../core/relations';
import type { NaiAutoQuality, PixaiAutoQuality, QualityCategory } from '../core/types';
import type { DialogApi } from './Dialog';
import { clearLayerWithUndo, saveLayerToShelf } from './layerActions';
import type { Store } from './store';
import { TagRow } from './TagRow';
import { useUiPrefs } from './uiPrefs';

export function QualityPanel({ store, dialog, relations }: { store: Store; dialog: DialogApi; relations: RelationHit[] }) {
  const { state, index } = store;
  const ws = state.workspace;
  const { settings } = state;
  const [prefs, setPrefs] = useUiPrefs();
  const [expanded, setExpanded] = useState<string | null>(null);
  const open = prefs.qualityAdvancedOpen;
  const fam = profileMeta(settings.profile).family;
  const isV5 = settings.profile === 'nai_v5';

  const active = ws.quality.filter(isActive);
  const selectedPrompts = active.map((i) => index.byId.get(i.tagId)?.prompt).filter((p): p is string => !!p);
  const auto = autoQualityInfo(settings, selectedPrompts);
  const quick = QUALITY_DATA.quickIds.map((id) => index.byId.get(id)!).filter(Boolean);
  const hitsByTag = useMemo(() => {
    const m = new Map<string, RelationHit[]>();
    for (const h of relations) if (h.bothActive) for (const id of h.rule.tagIds) m.set(id, [...(m.get(id) ?? []), h]);
    return m;
  }, [relations]);
  const detailActive = new Map(ws.detail.filter(isActive).map((i) => [i.tagId, i.strength]));
  const nameOf = (id: string) => index.byId.get(id)?.nameJa ?? id;
  const onToggle = (id: string) => store.updateWorkspace((w) => toggleLayerItem(w, 'quality', id));
  const onStrength = (id: string, v: number) => store.updateWorkspace((w) => setLayerItem(w, 'quality', id, { strength: v }));

  const naiOptions: { v: NaiAutoQuality; label: string }[] = isV5
    ? [
        { v: 'unknown', label: '未確認' },
        { v: 'off', label: 'OFF' },
        { v: 'light', label: 'Light' },
        { v: 'standard', label: 'Standard' },
      ]
    : [
        { v: 'unknown', label: '未確認' },
        { v: 'off', label: 'OFF' },
        { v: 'on', label: 'ON' },
      ];
  const naiValue: NaiAutoQuality = !isV5 && (settings.naiAutoQuality === 'light' || settings.naiAutoQuality === 'standard') ? 'on' : settings.naiAutoQuality;

  return (
    <section className="layer-card layer-quality" aria-labelledby="quality-title">
      <div className="layer-head">
        <h2 id="quality-title" className="layer-title">
          品質調合 <span className="layer-count">{active.length}件選択中</span>
        </h2>
        <button className="btn btn-small" aria-expanded={open} onClick={() => setPrefs({ qualityAdvancedOpen: !open })}>
          {open ? '詳細設定を閉じる' : '詳細設定'}
        </button>
      </div>
      <p className="small muted layer-lede">全体の品質・美的評価・解像感（初期OFF）。強度は詳細設定で。</p>
      <div className="quick-chips" role="group" aria-label="よく使う品質タグ">
        {quick.map((t) => {
          const it = ws.quality.find((i) => i.tagId === t.id);
          const on = !!it && isActive(it);
          const sup = isSupported(t, settings.profile);
          return (
            <button
              key={t.id}
              className={`chip quick-chip ${on ? 'chip-on' : ''} ${sup ? '' : 'chip-unsupported'}`}
              aria-pressed={on}
              title={sup ? t.nameJa : `${t.nameJa}（${profileMeta(settings.profile).short}では出力しません）`}
              onClick={() => onToggle(t.id)}
            >
              <span lang="en">{t.prompt}</span>
              {on && it!.strength !== 1 && <span className="chip-n">{it!.strength.toFixed(1)}</span>}
            </button>
          );
        })}
      </div>

      <div className="auto-quality">
        <label className="auto-row">
          <span className="small">{fam === 'nai' ? 'NovelAI側の自動品質タグ' : 'PIXAI側の自動品質タグ'}</span>
          {fam === 'nai' ? (
            <select className="text-input auto-select" value={naiValue} aria-label="NovelAIの自動品質タグ" onChange={(e) => store.setSettings({ naiAutoQuality: e.target.value as NaiAutoQuality })}>
              {naiOptions.map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          ) : (
            <select className="text-input auto-select" value={settings.pixaiAutoQuality} aria-label="PIXAIの自動品質タグ" onChange={(e) => store.setSettings({ pixaiAutoQuality: e.target.value as PixaiAutoQuality })}>
              <option value="unknown">未確認</option>
              <option value="off">OFF</option>
              <option value="on">ON</option>
            </select>
          )}
        </label>
        {auto.autoTags && auto.autoTags.length > 0 && <p className="small muted">{auto.status}</p>}
        {fam === 'pixai' && settings.pixaiAutoQuality === 'on' && (
          <input
            className="text-input"
            lang="en"
            placeholder="PIXAI側で追加されるタグ（分かる場合。カンマ区切り）"
            value={settings.pixaiAutoQualityTags}
            onChange={(e) => store.setSettings({ pixaiAutoQualityTags: e.target.value })}
            aria-label="PIXAI側で追加されるタグ"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
        {auto.notes.map((n, i) => (
          <p key={i} className="note-warn small auto-note" role="status">
            {n}
          </p>
        ))}
      </div>

      {open && (
        <div className="layer-body">
          <div className="row-actions">
            <button className="btn btn-small" onClick={() => shift(-0.1)} disabled={!active.length}>−0.1 一括</button>
            <button className="btn btn-small" onClick={() => shift(0.1)} disabled={!active.length}>＋0.1 一括</button>
            <button className="btn btn-small" onClick={() => void saveLayerToShelf(store, dialog, 'quality')} disabled={!ws.quality.length}>グループ棚に保存</button>
            <button className="btn btn-small btn-danger-ghost" onClick={() => clearLayerWithUndo(store, 'quality')} disabled={!ws.quality.length}>品質調合を空にする</button>
          </div>
          <p className="small muted">{auto.status}。サービス側の設定はアプリから読み取れないので、ご自身の設定を選んでください（アプリの出力には加えません。重複だけを知らせます）。</p>
          <p className="small muted">品質評価（出来の良し悪し）、美的評価（見栄え）、解像感、描き込み密度は役割が違います。8k や highres は実際の出力解像度を変えません。品質タグを増やすほど良くなるわけではありません。</p>
          {QUALITY_DATA.categories.map((c) => {
            const tags = QUALITY_TAGS.filter((t) => t.category === (c.key as QualityCategory));
            const n = tags.filter((t) => ws.quality.some((i) => i.tagId === t.id && isActive(i))).length;
            return (
              <div key={c.key} className="cat layer-cat" style={{ ['--cat' as string]: c.color }}>
                <h3 className="layer-cat-head">
                  <span className="cat-swatch" aria-hidden />
                  {c.label}
                  {n > 0 && <span className="cat-sel">{n}</span>}
                </h3>
                {c.note && <p className="small muted layer-cat-note">{c.note}</p>}
                <ul className="tag-list">
                  {tags.map((t) => (
                    <TagRow
                      key={t.id}
                      tag={t}
                      item={ws.quality.find((i) => i.tagId === t.id)}
                      others={[]}
                      hits={hitsByTag.get(t.id) ?? []}
                      profile={settings.profile}
                      expanded={expanded === t.id}
                      onExpand={setExpanded}
                      onToggle={onToggle}
                      onStrength={onStrength}
                      nameOf={nameOf}
                      otherLayerNote={detailActive.has(t.id) ? `仕上げディテールでも選択中（${detailActive.get(t.id)!.toFixed(1)}）。出力は1回だけです` : undefined}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  function shift(d: number) {
    const r = shiftLayer(ws, 'quality', d);
    store.updateWorkspace(() => r.ws);
    if (r.clamped.length) store.toast(`${r.clamped.length}件は上限・下限で止めました`, 'warn');
  }
}
