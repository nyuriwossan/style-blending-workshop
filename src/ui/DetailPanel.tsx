// 第3層｜仕上げディテール：目・髪・肌・唇・衣服・全体。初回は折りたたみ、開閉は端末に記憶
import { useEffect, useMemo, useState } from 'react';
import { DETAIL_DATA, DETAIL_PRESETS, DETAIL_VIEW_TAGS, categoryMeta, searchTags } from '../core/dictionary';
import { isActive, setLayerItem, shiftLayer, toggleLayerItem } from '../core/mix';
import type { RelationHit } from '../core/relations';
import type { DetailCategory, DetailType, MixItem } from '../core/types';
import type { DialogApi } from './Dialog';
import { applyItemsToLayer, clearLayerWithUndo, saveLayerToShelf } from './layerActions';
import type { Store } from './store';
import { TagRow } from './TagRow';
import { useUiPrefs } from './uiPrefs';

const subMemory: { open: Set<DetailCategory>; query: string } = { open: new Set(['eyes']), query: '' };

export function DetailPanel({ store, dialog, relations }: { store: Store; dialog: DialogApi; relations: RelationHit[] }) {
  const { state, index } = store;
  const ws = state.workspace;
  const profile = state.settings.profile;
  const [prefs, setPrefs] = useUiPrefs();
  const open = prefs.detailOpen;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState(subMemory.query);
  const [openSubs, setOpenSubs] = useState<Set<DetailCategory>>(() => new Set(subMemory.open));
  useEffect(() => {
    subMemory.open = openSubs;
    subMemory.query = query;
  }, [openSubs, query]);

  const active = ws.detail.filter(isActive);
  const qualityActive = new Map(ws.quality.filter(isActive).map((i) => [i.tagId, i.strength]));
  const hitsByTag = useMemo(() => {
    const m = new Map<string, RelationHit[]>();
    for (const h of relations) if (h.bothActive) for (const id of h.rule.tagIds) m.set(id, [...(m.get(id) ?? []), h]);
    return m;
  }, [relations]);
  const nameOf = (id: string) => index.byId.get(id)?.nameJa ?? id;
  const onToggle = (id: string) => store.updateWorkspace((w) => toggleLayerItem(w, 'detail', id));
  const onStrength = (id: string, v: number) => store.updateWorkspace((w) => setLayerItem(w, 'detail', id, { strength: v }));

  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    let list = searching ? searchTags(DETAIL_VIEW_TAGS, query) : DETAIL_VIEW_TAGS;
    if (!searching && prefs.detailView === 'basic') list = list.filter((t) => t.detailBasic || ws.detail.some((i) => i.tagId === t.id));
    if (prefs.detailType !== 'all') list = list.filter((t) => t.detailType === prefs.detailType || (!t.detailType && prefs.detailType === 'density'));
    return list;
  }, [searching, query, prefs.detailView, prefs.detailType, ws.detail]);
  const basicCount = DETAIL_VIEW_TAGS.filter((t) => t.detailBasic).length;
  const selectedTags = active.map((i) => ({ item: i, tag: index.byId.get(i.tagId) }));

  return (
    <section className={`layer-card layer-detail ${open ? 'is-open' : ''}`} aria-labelledby="detail-title">
      <h2 id="detail-title" className="layer-title-wrap">
        <button className="detail-toggle" aria-expanded={open} onClick={() => setPrefs({ detailOpen: !open })}>
          <span className="detail-caret" aria-hidden>{open ? '▾' : '▸'}</span>
          <span className="layer-title-text">高度な設定｜仕上げディテール</span>
          <span className={`layer-count ${active.length ? 'has' : ''}`}>{active.length}タグ選択中</span>
        </button>
      </h2>
      {!open && active.length > 0 && (
        <p className="small muted detail-summary">
          {selectedTags.map((s) => `${s.tag?.nameJa ?? s.item.tagId} ${s.item.strength.toFixed(1)}`).join('、')}（閉じていても出力に含まれます）
        </p>
      )}
      {open && (
        <div className="layer-body">
          <p className="small muted layer-lede">
            目・髪・肌・唇・衣服の描き込みと表面の質感を整えます。顔立ち・体格・髪型・髪色・衣服の種類は指定しません。外見変更リスクは調査資料にもとづく暫定の分類で、画像生成による実測ではありません。
          </p>

          {selectedTags.length > 0 && (
            <ul className="selected-chips" aria-label="選択中の仕上げディテール">
              {selectedTags.map(({ item, tag }) => (
                <li key={item.tagId} style={{ ['--cat' as string]: tag?.detailCategory ? categoryMeta(tag.detailCategory).color : 'var(--ink-2)' }}>
                  <button className="chip chip-selected" onClick={() => jump(item.tagId)} title="一覧で表示">
                    <i aria-hidden />
                    {tag?.nameJa ?? item.tagId}
                    <span className="chip-n">{item.strength.toFixed(1)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="detail-presets" role="group" aria-label="仕上げディテールのプリセット">
            <span className="small muted">プリセット：</span>
            {DETAIL_PRESETS.map((p) => (
              <button
                key={p.id}
                className="chip chip-preset"
                title={p.description_ja}
                onClick={() => void applyItemsToLayer(store, dialog, 'detail', p.name_ja, p.items.map((i): MixItem => ({ tagId: i.tagId, strength: i.strength, on: true })))}
              >
                {p.name_ja}
              </button>
            ))}
          </div>

          <div className="picker-tools">
            <input
              className="text-input search"
              type="search"
              inputMode="search"
              placeholder="仕上げディテールを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="仕上げディテールを検索"
            />
            <div className="seg" role="radiogroup" aria-label="仕上げディテールの表示件数">
              <button role="radio" aria-checked={prefs.detailView === 'basic'} onClick={() => setPrefs({ detailView: 'basic' })}>
                基本 {basicCount}
              </button>
              <button role="radio" aria-checked={prefs.detailView === 'all'} onClick={() => setPrefs({ detailView: 'all' })}>
                すべて {DETAIL_VIEW_TAGS.length}
              </button>
            </div>
          </div>
          <div className="picker-filters" role="radiogroup" aria-label="種類で絞り込む">
            {(['all', 'density', 'texture', 'finish'] as const).map((k) => (
              <button key={k} role="radio" aria-checked={prefs.detailType === k} className={`chip chip-filter ${prefs.detailType === k ? 'chip-on' : ''}`} onClick={() => setPrefs({ detailType: k as 'all' | DetailType })}>
                {k === 'all' ? 'すべて' : DETAIL_DATA.detailTypes[k]}
              </button>
            ))}
          </div>

          {DETAIL_DATA.categories.map((c) => {
            const key = c.key as DetailCategory;
            const tags = visible.filter((t) => t.detailCategory === key);
            const total = DETAIL_VIEW_TAGS.filter((t) => t.detailCategory === key).length;
            const n = DETAIL_VIEW_TAGS.filter((t) => t.detailCategory === key && ws.detail.some((i) => i.tagId === t.id && isActive(i))).length;
            const isOpen = searching || openSubs.has(key);
            return (
              <div key={key} className="cat" style={{ ['--cat' as string]: c.color }}>
                <button className="cat-head" aria-expanded={isOpen} onClick={() => toggleSub(key)}>
                  <span className="cat-swatch" aria-hidden />
                  <span className="cat-name">{c.label}</span>
                  {n > 0 && <span className="cat-sel">{n}</span>}
                  <span className="cat-count muted">{searching || prefs.detailView === 'basic' || prefs.detailType !== 'all' ? `${tags.length}/${total}` : total}</span>
                </button>
                {isOpen && (
                  <ul className="tag-list">
                    {tags.map((t) => (
                      <TagRow
                        key={t.id}
                        tag={t}
                        item={ws.detail.find((i) => i.tagId === t.id)}
                        others={[]}
                        hits={hitsByTag.get(t.id) ?? []}
                        profile={profile}
                        expanded={expanded === t.id}
                        onExpand={setExpanded}
                        onToggle={onToggle}
                        onStrength={onStrength}
                        nameOf={nameOf}
                        otherLayerNote={qualityActive.has(t.id) ? `品質調合でも選択中（${qualityActive.get(t.id)!.toFixed(1)}）。出力は1回だけです` : undefined}
                      />
                    ))}
                    {tags.length === 0 && <li className="small muted empty-row">この条件に合うタグはありません。</li>}
                  </ul>
                )}
              </div>
            );
          })}

          <div className="row-actions">
            <button className="btn btn-small" onClick={() => shift(-0.1)} disabled={!active.length}>−0.1 一括</button>
            <button className="btn btn-small" onClick={() => shift(0.1)} disabled={!active.length}>＋0.1 一括</button>
            <button className="btn btn-small" onClick={() => void saveLayerToShelf(store, dialog, 'detail')} disabled={!ws.detail.length}>グループ棚に保存</button>
            <button className="btn btn-small btn-danger-ghost" onClick={() => clearLayerWithUndo(store, 'detail')} disabled={!ws.detail.length}>仕上げディテールを空にする</button>
          </div>
        </div>
      )}
    </section>
  );

  function toggleSub(k: DetailCategory) {
    setOpenSubs((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }
  function jump(id: string) {
    const t = index.byId.get(id);
    if (!t?.detailCategory) return;
    setQuery('');
    setOpenSubs((s) => new Set(s).add(t.detailCategory!));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.querySelector(`.layer-detail [data-tag-id="${id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.classList.add('tag-flash');
        setTimeout(() => el?.classList.remove('tag-flash'), 1200);
      }),
    );
  }
  function shift(d: number) {
    const r = shiftLayer(ws, 'detail', d);
    store.updateWorkspace(() => r.ws);
    if (r.clamped.length) store.toast(`${r.clamped.length}件は上限・下限で止めました`, 'warn');
  }
}
