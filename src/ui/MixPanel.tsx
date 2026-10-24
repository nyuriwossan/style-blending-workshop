// 画面A｜調合：調合皿・グループ・関係警告・タグ選択
import { memo, useEffect, useMemo, useState } from 'react';
import {
  META,
  SLIDER,
  categoryMeta,
  evidenceLabel,
  profileMeta,
  searchTags,
  subcategoryLabel,
} from '../core/dictionary';
import {
  DEDUPE_RULE_LABEL,
  activeGroup,
  addGroup,
  deleteGroup,
  duplicateGroup,
  isActive,
  moveGroup,
  removeItem,
  renameGroup,
  setGroupEnabled,
  setItem,
  shiftGroup,
  toggleItem,
  newId,
  type EffectiveItem,
} from '../core/mix';
import { rulesForTag, type RelationHit } from '../core/relations';
import { CATEGORY_KEYS, type CategoryKey, type MixItem, type ProfileId, type Tag } from '../core/types';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

type Occ = { groupId: string; groupName: string; strength: number; on: boolean; enabled: boolean };

export interface MixProps {
  store: Store;
  dialog: DialogApi;
  effective: EffectiveItem[];
  relations: RelationHit[];
  unknownIds: string[];
}

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

// ── 調合皿：選択中タグを顔料の帯として並べる ──
export function MixTray({ effective, onJump }: { effective: EffectiveItem[]; onJump: (t: Tag) => void }) {
  const known = effective.filter((e) => e.tag);
  const total = known.reduce((a, e) => a + e.strength, 0);
  if (known.length === 0)
    return (
      <div className="tray tray-empty" aria-label="調合皿">
        <p>まだ何も混ぜていません。下の一覧からタグを選ぶか、プリセットから始めてください。</p>
      </div>
    );
  return (
    <div className="tray" aria-label="調合皿">
      <div className="tray-strip" role="list">
        {known.map((e) => {
          const c = categoryMeta(e.tag!.category);
          return (
            <button
              key={e.tagId}
              role="listitem"
              className="band"
              style={{ flexGrow: e.strength, background: c.color, opacity: 0.35 + (e.strength / SLIDER.max) * 0.65 }}
              title={`${e.tag!.nameJa} ${e.strength.toFixed(1)}`}
              aria-label={`${e.tag!.nameJa}（${c.label}）強度${e.strength.toFixed(1)}。一覧で表示`}
              onClick={() => onJump(e.tag!)}
            />
          );
        })}
      </div>
      <ul className="tray-legend">
        {CATEGORY_KEYS.map((k) => {
          const items = known.filter((e) => e.tag!.category === k);
          if (!items.length) return null;
          const c = categoryMeta(k);
          const share = Math.round((items.reduce((a, e) => a + e.strength, 0) / total) * 100);
          return (
            <li key={k}>
              <i style={{ background: c.color }} />
              {c.short} {items.length}
              <span className="muted"> {share}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── グループバー ──
function GroupBar({ store, dialog }: { store: Store; dialog: DialogApi }) {
  const ws = store.state.workspace;
  const act = activeGroup(ws);

  const openMenu = async () => {
    const idx = ws.groups.findIndex((g) => g.id === act.id);
    const a = await dialog.ask(
      `グループ「${act.name}」`,
      <p className="muted">一括調整は、各タグの値そのものを ±0.1 します（隠れた倍率は使いません）。</p>,
      [
        { value: 'minus', label: '−0.1 一括' },
        { value: 'plus', label: '＋0.1 一括' },
        { value: 'rename', label: '名前を変える' },
        { value: 'dup', label: '複製' },
        { value: 'toggle', label: act.enabled ? '一時的に無効にする' : '有効にする' },
        ...(idx > 0 ? [{ value: 'moveUp', label: '上へ（優先度を上げる）' }] : []),
        ...(idx < ws.groups.length - 1 ? [{ value: 'moveDown', label: '下へ' }] : []),
        { value: 'shelf', label: 'グループ棚に保存' },
        { value: 'delete', label: '削除', tone: 'danger' as const },
        { value: 'close', label: '閉じる', tone: 'plain' as const },
      ],
    );
    if (a === 'minus' || a === 'plus') {
      const r = shiftGroup(ws, act.id, a === 'minus' ? -0.1 : 0.1);
      store.updateWorkspace(() => r.ws);
      if (r.clamped.length) store.toast(`${r.clamped.length}件は上限・下限で止めました`, 'warn');
    } else if (a === 'rename') {
      const n = await dialog.promptText('グループ名', act.name);
      if (n) store.updateWorkspace((w) => renameGroup(w, act.id, n));
    } else if (a === 'dup') store.updateWorkspace((w) => duplicateGroup(w, act.id));
    else if (a === 'toggle') store.updateWorkspace((w) => setGroupEnabled(w, act.id, !act.enabled));
    else if (a === 'moveUp') store.updateWorkspace((w) => moveGroup(w, act.id, -1));
    else if (a === 'moveDown') store.updateWorkspace((w) => moveGroup(w, act.id, 1));
    else if (a === 'shelf') {
      const n = await dialog.promptText('グループ棚に保存', act.name, '保存');
      if (n) {
        const now = new Date().toISOString();
        store.update((s) => ({ ...s, groups: [{ id: newId('sgp'), name: n, createdAt: now, updatedAt: now, items: act.items.map((i) => ({ ...i })) }, ...s.groups] }));
        store.toast(`「${n}」をグループ棚に保存しました`);
      }
    } else if (a === 'delete') {
      if (await dialog.confirm('グループを削除', `「${act.name}」（${act.items.length}タグ）を調合から外します。「元に戻す」で取り消せます。`, '削除', true))
        store.updateWorkspace((w) => deleteGroup(w, act.id));
    }
  };

  return (
    <div className="groupbar">
      <div className="groupbar-head">
        <span className="small muted">編集中のグループ</span>
        {ws.groups.length > 1 && (
          <span className="small muted">重複タグ：{DEDUPE_RULE_LABEL[ws.dedupeRule]}</span>
        )}
      </div>
      <div className="chips" role="tablist" aria-label="調合グループ">
        {ws.groups.map((g) => {
          const n = g.items.filter(isActive).length;
          const on = g.id === act.id;
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={on}
              className={`chip ${on ? 'chip-on' : ''} ${g.enabled ? '' : 'chip-disabled'}`}
              onClick={() => (on ? openMenu() : store.updateWorkspace((w) => ({ ...w, activeGroupId: g.id })))}
            >
              {g.name}
              <span className="chip-n">{n}</span>
              {on && <span className="chip-more" aria-hidden>⋯</span>}
            </button>
          );
        })}
        <button
          className="chip chip-add"
          onClick={async () => {
            const n = await dialog.promptText('新しいグループ', `調合グループ${ws.groups.length + 1}`, '作成', <p className="muted">例：「繊細な茶色の線画」「逆光の照明」など、まとまりごとに分けておくと再利用しやすくなります。</p>);
            if (n) store.updateWorkspace((w) => addGroup(w, n));
          }}
        >
          ＋ グループ
        </button>
      </div>
      {!act.enabled && <p className="note-warn small">このグループは無効です。出力には含まれません。</p>}
    </div>
  );
}

// ── 関係・重複・不明タグの通知 ──
function Notices({ store, effective, relations, unknownIds }: Omit<MixProps, 'dialog'>) {
  const seriousCount = relations.filter((r) => r.bothActive && (r.level === 'strong' || r.level === 'warn')).length + unknownIds.length;
  const [open, setOpen] = useState(seriousCount > 0);
  const [lastSerious, setLastSerious] = useState(seriousCount);
  if (seriousCount !== lastSerious) {
    setLastSerious(seriousCount);
    if (seriousCount > lastSerious) setOpen(true);
  }
  const { index } = store;
  const ws = store.state.workspace;
  const name = (id: string) => index.byId.get(id)?.nameJa ?? id;
  const turnOff = (id: string) => {
    store.updateWorkspace((w) => ({
      ...w,
      groups: w.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.tagId === id ? { ...i, on: false } : i)) })),
    }));
    store.toast(`「${name(id)}」をOFFにしました`);
  };
  const dups = effective.filter((e) => e.sources.length > 1);
  const serious = relations.filter((r) => r.bothActive && (r.level === 'strong' || r.level === 'warn'));
  const infos = relations.filter((r) => r.bothActive && (r.level === 'info' || r.level === 'suggest'));
  const suggestions = relations.filter((r) => !r.bothActive).slice(0, 6);
  const total = serious.length + infos.length + suggestions.length + dups.length + unknownIds.length;
  if (!total) return null;

  return (
    <section className="notices">
      <button className="notices-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          {serious.length > 0 && <b className="pill pill-warn">注意 {serious.length}</b>}
          {infos.length > 0 && <b className="pill">組合せ {infos.length}</b>}
          {suggestions.length > 0 && <b className="pill pill-suggest">相性候補 {suggestions.length}</b>}
          {dups.length > 0 && <b className="pill">重複 {dups.length}</b>}
          {unknownIds.length > 0 && <b className="pill pill-warn">不明 {unknownIds.length}</b>}
        </span>
        <span className="muted small">{open ? '閉じる' : '開く'}</span>
      </button>
      {open && (
        <ul className="notice-list">
          {serious.map((h) => (
            <li key={h.rule.id} className={`notice notice-${h.level}`}>
              <p>
                <b>{h.label}</b>：{name(h.rule.tagIds[0])} × {name(h.rule.tagIds[1])}
              </p>
              <p className="small">{h.rule.reason_JA} 選択はそのまま残しています。</p>
              <div className="notice-actions">
                <button className="btn btn-small" onClick={() => turnOff(h.rule.tagIds[0])}>「{name(h.rule.tagIds[0])}」をOFF</button>
                <button className="btn btn-small" onClick={() => turnOff(h.rule.tagIds[1])}>「{name(h.rule.tagIds[1])}」をOFF</button>
              </div>
            </li>
          ))}
          {infos.map((h) => (
            <li key={h.rule.id} className={`notice notice-${h.level}`}>
              <p>
                <b>{h.label}</b>：{name(h.rule.tagIds[0])} × {name(h.rule.tagIds[1])}
              </p>
              <p className="small">{h.rule.reason_JA}</p>
            </li>
          ))}
          {suggestions.map((h) => (
            <li key={h.rule.id} className="notice notice-suggest">
              <p>
                <b>相性候補</b>：{name(h.rule.tagIds.find((x) => x !== h.missing)!)} には「{name(h.missing!)}」
              </p>
              <div className="notice-actions">
                <button
                  className="btn btn-small"
                  onClick={() => {
                    store.updateWorkspace((w) => setItem(w, w.activeGroupId, h.missing!, { on: true, strength: SLIDER.default }));
                    store.toast(`「${name(h.missing!)}」を追加しました`);
                  }}
                >
                  ＋ 追加
                </button>
              </div>
            </li>
          ))}
          {dups.map((e) => (
            <li key={e.tagId} className="notice notice-info">
              <p>
                <b>重複</b>：「{name(e.tagId)}」が {e.sources.length} グループにあります
              </p>
              <p className="small">
                {e.sources.map((s) => `${s.groupName} ${s.strength.toFixed(1)}`).join(' ／ ')} → 出力は {e.strength.toFixed(1)}（{DEDUPE_RULE_LABEL[ws.dedupeRule]}、{e.adoptedFrom.groupName}）。値は加算しません。
              </p>
            </li>
          ))}
          {unknownIds.map((id) => (
            <li key={id} className="notice notice-warn">
              <p>
                <b>辞書にないタグ</b>：{id}
              </p>
              <p className="small">読み込んだデータに含まれていました。消さずに保持していますが、出力には含めません。</p>
              <div className="notice-actions">
                <button
                  className="btn btn-small"
                  onClick={() => store.updateWorkspace((w) => w.groups.reduce((acc, g) => removeItem(acc, g.id, id), w))}
                >
                  調合から削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── タグ1件 ──
interface RowProps {
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
}

const TagRow = memo(function TagRow({ tag, item, others, hits, profile, expanded, onExpand, onToggle, onStrength, nameOf }: RowProps) {
  const on = !!item && isActive(item);
  const pm = profileMeta(profile);
  const ev = evidenceLabel(tag.evidenceLevel);
  const worst = hits.find((h) => h.level === 'strong') ?? hits.find((h) => h.level === 'warn');
  return (
    <li id={`tag-${tag.id}`} className={`tag ${on ? 'tag-on' : ''}`}>
      <div className="tag-main">
        <button className="tag-toggle" aria-pressed={on} onClick={() => onToggle(tag.id)}>
          <span className="tag-check" aria-hidden />
          <span className="tag-names">
            <span className="tag-ja">
              {tag.nameJa}
              {tag.origin === 'user' && <span className="badge badge-user">自作</span>}
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
      {others.length > 0 && (
        <p className="small muted tag-others">
          他のグループにも：{others.map((o) => `${o.groupName} ${o.on ? o.strength.toFixed(1) : 'OFF'}${o.enabled ? '' : '（無効）'}`).join('、')}
        </p>
      )}
      {expanded && (
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
            <dt>{pm.short}での状況</dt>
            <dd>{tag.modelStatus[pm.statusKey]}</dd>
            <dt>画像での検証</dt>
            <dd>未実施（{tag.validationStatus}）</dd>
            <dt>顔への影響</dt>
            <dd>{tag.faceImpact}</dd>
            <dt>ID</dt>
            <dd className="mono-id">{tag.id}{tag.priority !== '-' && `（優先度 ${tag.priority}）`}</dd>
          </dl>
          {rulesForTag(tag.id).length > 0 && (
            <div className="tag-rel">
              <p className="small muted">定義済みの関係</p>
              <ul>
                {rulesForTag(tag.id).map((r) => {
                  const other = r.tagIds.find((x) => x !== tag.id)!;
                  return (
                    <li key={r.id} className="small">
                      {META.relationTypes[r.type]?.label}：{nameOf(other)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
});

// ── タグ選択（カテゴリ別・検索・基本/詳細） ──
// タブを切り替えても開閉状態と検索語を保つ（このページを開いている間だけ）
const pickerMemory: { open: Set<CategoryKey>; query: string } = { open: new Set(['style_genre']), query: '' };

function TagPicker({ store, relations, jumpTo }: { store: Store; relations: RelationHit[]; jumpTo: { id: string; n: number } | null }) {
  const { state, index } = store;
  const { settings, workspace: ws } = state;
  const act = activeGroup(ws);
  const [query, setQuery] = useState(pickerMemory.query);
  const [openCats, setOpenCats] = useState<Set<CategoryKey>>(() => new Set(pickerMemory.open));
  useEffect(() => {
    pickerMemory.open = openCats;
    pickerMemory.query = query;
  }, [openCats, query]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // タグID → 出現箇所
  const occ = useMemo(() => {
    const m = new Map<string, Occ[]>();
    for (const g of ws.groups)
      for (const i of g.items) {
        const arr = m.get(i.tagId) ?? [];
        arr.push({ groupId: g.id, groupName: g.name, strength: i.strength, on: isActive(i), enabled: g.enabled });
        m.set(i.tagId, arr);
      }
    return m;
  }, [ws.groups]);
  const hitsByTag = useMemo(() => {
    const m = new Map<string, RelationHit[]>();
    for (const h of relations)
      if (h.bothActive)
        for (const id of h.rule.tagIds) {
          const a = m.get(id) ?? [];
          a.push(h);
          m.set(id, a);
        }
    return m;
  }, [relations]);

  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    if (searching) return searchTags(index.all, query); // 検索は常に全件が対象
    if (settings.view === 'detail') return index.all;
    return index.all.filter((t) => t.mvpCore || t.origin === 'user' || occ.has(t.id));
  }, [searching, query, index.all, settings.view, occ]);

  useEffect(() => {
    if (!jumpTo) return;
    const t = index.byId.get(jumpTo.id);
    if (!t) return;
    setQuery('');
    setOpenCats((s) => new Set(s).add(t.category));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById(`tag-${t.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.classList.add('tag-flash');
        setTimeout(() => el?.classList.remove('tag-flash'), 1200);
      }),
    );
  }, [jumpTo, index.byId]);

  const onToggle = (id: string) => store.updateWorkspace((w) => toggleItem(w, w.activeGroupId, id));
  const onStrength = (id: string, v: number) => store.updateWorkspace((w) => setItem(w, w.activeGroupId, id, { strength: v }));
  const nameOf = (id: string) => index.byId.get(id)?.nameJa ?? id;

  return (
    <section className="picker" aria-label="タグを選ぶ">
      <div className="picker-tools">
        <input
          className="text-input search"
          type="search"
          inputMode="search"
          placeholder="タグを検索（日・英）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="タグを検索"
        />
        <div className="seg" role="radiogroup" aria-label="表示件数">
          <button role="radio" aria-checked={settings.view === 'basic'} onClick={() => store.setSettings({ view: 'basic' })}>
            基本 72
          </button>
          <button role="radio" aria-checked={settings.view === 'detail'} onClick={() => store.setSettings({ view: 'detail' })}>
            詳細 {index.all.length}
          </button>
        </div>
      </div>
      <p className="small muted picker-note">
        {searching
          ? `全${index.all.length}件から ${visible.length} 件。`
          : settings.view === 'basic'
            ? '基本表示：初期おすすめ72件と、選択中・自作のタグを表示しています。'
            : '詳細表示：全タグを小分類ごとに表示しています。'}
        「{act.name}」に追加されます。
      </p>
      {CATEGORY_KEYS.map((k) => {
        const tags = visible.filter((t) => t.category === k);
        if (!tags.length) return null;
        const c = categoryMeta(k);
        const isOpen = searching || openCats.has(k);
        const selected = act.items.filter((i) => isActive(i) && index.byId.get(i.tagId)?.category === k).length;
        const subs = settings.view === 'detail' && !searching ? [...new Set(tags.map((t) => t.subcategory))] : [null];
        return (
          <div key={k} className="cat" style={{ ['--cat' as string]: c.color }}>
            <button
              className="cat-head"
              aria-expanded={isOpen}
              onClick={() =>
                setOpenCats((s) => {
                  const n = new Set(s);
                  if (n.has(k)) n.delete(k);
                  else n.add(k);
                  return n;
                })
              }
            >
              <span className="cat-swatch" aria-hidden />
              <span className="cat-name">{c.label}</span>
              {selected > 0 && <span className="cat-sel">{selected}</span>}
              <span className="cat-count muted">{tags.length}</span>
            </button>
            {isOpen &&
              subs.map((sub) => {
                const list = sub === null ? tags : tags.filter((t) => t.subcategory === sub);
                return (
                  <div key={sub ?? 'all'}>
                    {sub !== null && <h4 className="sub-head">{sub === 'user_defined' ? 'ユーザー定義' : subcategoryLabel(sub)}</h4>}
                    <ul className="tag-list">
                      {list.map((t) => {
                        const all = occ.get(t.id) ?? [];
                        return (
                          <TagRow
                            key={t.id}
                            tag={t}
                            item={act.items.find((i) => i.tagId === t.id)}
                            others={all.filter((o) => o.groupId !== act.id)}
                            hits={hitsByTag.get(t.id) ?? []}
                            profile={settings.profile}
                            expanded={expanded === t.id}
                            onExpand={setExpanded}
                            onToggle={onToggle}
                            onStrength={onStrength}
                            nameOf={nameOf}
                          />
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
          </div>
        );
      })}
      {visible.length === 0 && <p className="empty">見つかりませんでした。別の言い方（英語・ひらがな）でも探せます。ないタグは「保存棚 → 自作タグ」で追加できます。</p>}
    </section>
  );
}

export function MixPanel(props: MixProps) {
  const [jump, setJump] = useState<{ id: string; n: number } | null>(null);
  return (
    <div className="mix">
      <MixTray effective={props.effective} onJump={(t) => setJump({ id: t.id, n: Date.now() })} />
      <GroupBar store={props.store} dialog={props.dialog} />
      <Notices store={props.store} effective={props.effective} relations={props.relations} unknownIds={props.unknownIds} />
      <TagPicker store={props.store} relations={props.relations} jumpTo={jump} />
    </div>
  );
}
