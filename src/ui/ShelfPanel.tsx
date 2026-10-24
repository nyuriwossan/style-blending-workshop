// 保存棚：レシピ・グループ・自作タグ・バックアップ
import { useRef, useState } from 'react';
import { META, buildIndex, categoryMeta, profileMeta } from '../core/dictionary';
import { addGroup, dedupeWithin, isActive, isMixEmpty, newId, referencedTagIds } from '../core/mix';
import { applyItemsToLayer, LAYER_NAME } from './layerActions';
import {
  exportBackup,
  exportGroup,
  exportRecipe,
  importIntoState,
  restoreFromBackup,
  validateCustomPrompt,
} from '../core/schema';
import { CATEGORY_KEYS, type CategoryKey, type CustomTag, type MixGroup, type MixItem, type Recipe, type SavedGroup } from '../core/types';
import { downloadJson, readFileText, safeFilename, stamp } from '../storage/files';
import { loadPrevious, stashPrevious } from '../storage/persist';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

const LAYER_LABEL = { style: '画風', quality: '品質', detail: '仕上げ' } as const;
const cloneItems = (xs: MixItem[]) => xs.map((i) => ({ ...i }));
const cloneGroups = (gs: MixGroup[]): MixGroup[] => gs.map((g) => ({ ...g, id: newId('grp'), items: g.items.map((i) => ({ ...i })) }));
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function ShelfPanel({ store, dialog, onLoaded }: { store: Store; dialog: DialogApi; onLoaded: () => void }) {
  const { state } = store;
  const ws = state.workspace;
  const editing = ws.sourceRecipeId ? state.recipes.find((r) => r.id === ws.sourceRecipeId) : undefined;
  const wsEmpty = isMixEmpty(ws);

  // ── レシピ ──
  const saveNew = async () => {
    const name = await dialog.promptText('レシピとして保存', editing ? `${editing.name}（別版）` : '新しい画風レシピ', '保存');
    if (!name) return;
    const now = new Date().toISOString();
    const r: Recipe = {
      id: newId('rcp'), name, note: '', createdAt: now, updatedAt: now, groups: cloneGroups(ws.groups), dedupeRule: ws.dedupeRule, profile: state.settings.profile,
      years: ws.years.map((y) => ({ ...y })), complexity: ws.complexity, quality: cloneItems(ws.quality), detail: cloneItems(ws.detail),
    };
    store.update((s) => ({ ...s, recipes: [r, ...s.recipes], workspace: { ...s.workspace, sourceRecipeId: r.id } }));
    store.toast(`「${name}」を保存しました`);
  };
  const overwrite = async () => {
    if (!editing) return;
    if (!(await dialog.confirm('上書き保存', `「${editing.name}」を今の調合内容で上書きします。`, '上書き保存'))) return;
    const now = new Date().toISOString();
    store.update((s) => ({
      ...s,
      recipes: s.recipes.map((r) =>
        r.id === editing.id
          ? { ...r, groups: cloneGroups(ws.groups), dedupeRule: ws.dedupeRule, profile: s.settings.profile, years: ws.years.map((y) => ({ ...y })), complexity: ws.complexity, quality: cloneItems(ws.quality), detail: cloneItems(ws.detail), updatedAt: now }
          : r,
      ),
    }));
    store.toast(`「${editing.name}」を上書き保存しました`);
  };
  const loadRecipe = async (r: Recipe) => {
    if (!wsEmpty && !(await dialog.confirm('レシピを読み込む', `今の調合を「${r.name}」に入れ替えます。直後なら「元に戻す」で戻せます。`, '読み込む'))) return;
    const groups = cloneGroups(r.groups.length ? r.groups : [{ id: newId('grp'), name: '調合グループ1', enabled: true, items: [] }]);
    store.updateWorkspace(() => ({
      groups, activeGroupId: groups[0].id, dedupeRule: r.dedupeRule, sourceRecipeId: r.id,
      years: r.years.map((y) => ({ ...y })), complexity: r.complexity, quality: cloneItems(r.quality), detail: cloneItems(r.detail),
    }));
    if (r.profile !== state.settings.profile) store.setSettings({ profile: r.profile });
    const idx = buildIndex(state.customTags);
    const unknown = new Set([...r.groups.flatMap((g) => g.items), ...r.quality, ...r.detail].filter((i) => !idx.byId.has(i.tagId)).map((i) => i.tagId));
    store.toast(unknown.size ? `「${r.name}」を読み込みました。辞書にないタグが ${unknown.size} 件あります` : `「${r.name}」を読み込みました（出力先：${profileMeta(r.profile).short}）`, unknown.size ? 'warn' : 'ok');
    onLoaded();
  };
  /** レシピの一部（画風／品質／仕上げ）だけを今の調合に読み込む。他の層は変えない */
  const loadPart = async (r: Recipe) => {
    const a = await dialog.ask(
      `「${r.name}」の一部だけ読み込む`,
      <p>選んだ層だけを今の調合と入れ替えます。ほかの層はそのまま残ります。直後なら「元に戻す」で戻せます。</p>,
      [
        { value: 'cancel', label: 'やめる', tone: 'plain' },
        { value: 'style', label: `画風だけ（年・複雑度を含む）` },
        { value: 'quality', label: `品質だけ（${r.quality.filter(isActive).length}件）` },
        { value: 'detail', label: `仕上げだけ（${r.detail.filter(isActive).length}件）` },
      ],
    );
    if (!a || a === 'cancel') return;
    if (a === 'style') {
      const groups = cloneGroups(r.groups.length ? r.groups : [{ id: newId('grp'), name: '調合グループ1', enabled: true, items: [] }]);
      store.updateWorkspace((w) => ({ ...w, groups, activeGroupId: groups[0].id, dedupeRule: r.dedupeRule, years: r.years.map((y) => ({ ...y })), complexity: r.complexity }));
    } else {
      const layer = a as 'quality' | 'detail';
      store.updateWorkspace((w) => ({ ...w, [layer]: cloneItems(r[layer]) }));
    }
    store.toast(`「${r.name}」の${LAYER_LABEL[a as keyof typeof LAYER_LABEL]}を読み込みました`, 'ok', { label: '元に戻す', onClick: store.undo });
    onLoaded();
  };
  const renameRecipe = async (r: Recipe) => {
    const n = await dialog.promptText('名前を変える', r.name);
    if (n) store.update((s) => ({ ...s, recipes: s.recipes.map((x) => (x.id === r.id ? { ...x, name: n, updatedAt: new Date().toISOString() } : x)) }));
  };
  const dupRecipe = (r: Recipe) => {
    const now = new Date().toISOString();
    const copy: Recipe = { ...r, id: newId('rcp'), name: `${r.name}のコピー`, groups: cloneGroups(r.groups), quality: cloneItems(r.quality), detail: cloneItems(r.detail), createdAt: now, updatedAt: now };
    store.update((s) => {
      const i = s.recipes.findIndex((x) => x.id === r.id);
      const recipes = s.recipes.slice();
      recipes.splice(i + 1, 0, copy);
      return { ...s, recipes };
    });
    store.toast(`「${copy.name}」を作りました`);
  };
  const deleteRecipe = async (r: Recipe) => {
    if (!(await dialog.confirm('レシピを削除', `「${r.name}」を保存棚から削除します。この操作は元に戻せません。必要なら先に書き出してください。`, '削除', true))) return;
    store.update((s) => ({ ...s, recipes: s.recipes.filter((x) => x.id !== r.id), workspace: s.workspace.sourceRecipeId === r.id ? { ...s.workspace, sourceRecipeId: null } : s.workspace }));
  };

  // ── グループ ──
  const insertGroup = async (g: SavedGroup) => {
    if (g.layer === 'quality' || g.layer === 'detail') {
      if (await applyItemsToLayer(store, dialog, g.layer, g.name, g.items)) onLoaded();
      return;
    }
    store.updateWorkspace((w) => addGroup(w, g.name, dedupeWithin(g.items)));
    store.toast(`「${g.name}」を調合に加えました`);
    onLoaded();
  };
  const renameSaved = async (g: SavedGroup) => {
    const n = await dialog.promptText('名前を変える', g.name);
    if (n) store.update((s) => ({ ...s, groups: s.groups.map((x) => (x.id === g.id ? { ...x, name: n, updatedAt: new Date().toISOString() } : x)) }));
  };
  const dupSaved = (g: SavedGroup) => {
    const now = new Date().toISOString();
    store.update((s) => ({ ...s, groups: [{ ...g, id: newId('sgp'), name: `${g.name}のコピー`, items: g.items.map((i) => ({ ...i })), createdAt: now, updatedAt: now }, ...s.groups] }));
  };
  const deleteSaved = async (g: SavedGroup) => {
    if (!(await dialog.confirm('グループを削除', `「${g.name}」をグループ棚から削除します。この操作は元に戻せません。`, '削除', true))) return;
    store.update((s) => ({ ...s, groups: s.groups.filter((x) => x.id !== g.id) }));
  };

  // ── バックアップ ──
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [importReport, setImportReport] = useState<string[] | null>(null);
  const prev = loadPrevious();

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileText(file);
      const r = importIntoState(state, text, (c) => new Set(buildIndex(c).byId.keys()));
      store.update(() => r.state);
      const msg = `レシピ ${r.added.recipes} 件・グループ ${r.added.groups} 件・自作タグ ${r.added.customTags} 件を追加しました`;
      setImportReport([msg, ...r.warnings]);
      store.toast(msg, r.warnings.length ? 'warn' : 'ok');
    } catch (e) {
      setImportReport([`読み込めませんでした：${(e as Error).message}`]);
      store.toast((e as Error).message, 'warn');
    }
  };
  const onRestore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileText(file);
      const r = restoreFromBackup(text);
      if (!(await dialog.confirm('バックアップから完全復元', `今のデータ（レシピ ${state.recipes.length} 件ほか）をすべてこのバックアップに置き換えます。置き換え前の状態は1回分だけ退避しておき、「直前の状態に戻す」で戻せます。`, '置き換える', true))) return;
      stashPrevious(state);
      store.update(() => r.state);
      setImportReport(['完全復元しました', ...r.warnings]);
    } catch (e) {
      setImportReport([`復元できませんでした：${(e as Error).message}`]);
    }
  };

  return (
    <section className="shelf">
      {/* レシピ */}
      <div className="shelf-sec">
        <h3>画風レシピ</h3>
        <p className="small muted">画風・品質・仕上げディテールの3層と、強度・ON/OFF・年タグ・複雑度・出力先をまとめて保存します。「一部だけ読み込む」で、ひとつの層だけを再利用できます。</p>
        {editing && <p className="small editing">編集中：「{editing.name}」</p>}
        <div className="row-actions">
          <button className="btn btn-primary" onClick={saveNew} disabled={wsEmpty}>新しいレシピとして保存</button>
          {editing && <button className="btn" onClick={overwrite}>「{editing.name}」に上書き保存</button>}
        </div>
        {state.recipes.length === 0 ? (
          <p className="empty">まだレシピはありません。調合したら、ここから保存できます。</p>
        ) : (
          <ul className="shelf-list">
            {state.recipes.map((r) => {
              const n = new Set(r.groups.filter((g) => g.enabled).flatMap((g) => g.items.filter(isActive).map((i) => i.tagId))).size;
              const nq = r.quality.filter(isActive).length;
              const nd = r.detail.filter(isActive).length;
              return (
                <li key={r.id} className={ws.sourceRecipeId === r.id ? 'is-current' : ''}>
                  <div className="shelf-item-head">
                    <b>{r.name}</b>
                    <span className="small muted">
                      画風{n}・品質{nq}・仕上げ{nd}／{r.groups.length}グループ／{profileMeta(r.profile).short}／{fmtDate(r.updatedAt)}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button className="btn btn-small btn-primary" onClick={() => loadRecipe(r)}>読み込んで編集</button>
                    <button className="btn btn-small" onClick={() => loadPart(r)}>一部だけ読み込む</button>
                    <button className="btn btn-small" onClick={() => renameRecipe(r)}>名前変更</button>
                    <button className="btn btn-small" onClick={() => dupRecipe(r)}>複製</button>
                    <button className="btn btn-small" onClick={() => downloadJson(exportRecipe(r, state.customTags), `recipe_${safeFilename(r.name)}_${stamp()}.json`)}>書き出し</button>
                    <button className="btn btn-small btn-danger-ghost" onClick={() => deleteRecipe(r)}>削除</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* グループ棚 */}
      <div className="shelf-sec">
        <h3>グループ棚</h3>
        <p className="small muted">「繊細な茶色の線画」のような画風の部品や、品質・仕上げディテールのセットを保存して、別のレシピに組み込めます。画風は調合画面のグループメニュー（編集中のグループをもう一度タップ）、品質・仕上げは各パネルの「グループ棚に保存」から保存します。</p>
        {state.groups.length === 0 ? (
          <p className="empty">保存したグループはまだありません。</p>
        ) : (
          <ul className="shelf-list">
            {state.groups.map((g) => (
              <li key={g.id}>
                <div className="shelf-item-head">
                  <b>
                    <span className={`layer-tag layer-tag-${g.layer}`}>{LAYER_LABEL[g.layer]}</span>
                    {g.name}
                  </b>
                  <span className="small muted">
                    {g.items
                      .filter(isActive)
                      .map((i) => `${store.index.byId.get(i.tagId)?.nameJa ?? i.tagId} ${i.strength.toFixed(1)}`)
                      .join('、') || '（タグなし）'}
                  </span>
                </div>
                <div className="row-actions">
                  <button className="btn btn-small btn-primary" onClick={() => void insertGroup(g)}>
                    {g.layer === 'style' ? '調合に加える' : `${LAYER_NAME[g.layer]}に入れる`}
                  </button>
                  <button className="btn btn-small" onClick={() => renameSaved(g)}>名前変更</button>
                  <button className="btn btn-small" onClick={() => dupSaved(g)}>複製</button>
                  <button className="btn btn-small" onClick={() => downloadJson(exportGroup(g, state.customTags), `group_${safeFilename(g.name)}_${stamp()}.json`)}>書き出し</button>
                  <button className="btn btn-small btn-danger-ghost" onClick={() => deleteSaved(g)}>削除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CustomTagsSection store={store} dialog={dialog} />

      {/* バックアップ */}
      <div className="shelf-sec">
        <h3>バックアップ</h3>
        <p className="small muted">
          データはこの端末のブラウザ内だけに保存されます。ブラウザのデータ削除やプライベートブラウズでは消えることがあるので、ときどき書き出して保管してください。
          {!store.storageOk && <b className="note-warn"> 現在、端末内保存ができていません。</b>}
        </p>
        <div className="row-actions">
          <button className="btn btn-primary" onClick={() => downloadJson(exportBackup(state), `style-blending-backup_${stamp()}.json`)}>全体を書き出す（JSON）</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>読み込んで追加</button>
          <button className="btn" onClick={() => restoreRef.current?.click()}>完全復元（置き換え）</button>
          {prev && (
            <button
              className="btn"
              onClick={async () => {
                if (!(await dialog.confirm('直前の状態に戻す', `${fmtDate(prev.savedAt)} に退避した状態に戻します。今の状態は代わりに退避されます。`, '戻す'))) return;
                stashPrevious(state);
                store.update(() => prev.state);
                store.toast('直前の状態に戻しました');
              }}
            >
              直前の状態に戻す
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={restoreRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onRestore(e.target.files?.[0]); e.target.value = ''; }} />
        <p className="small muted">「読み込んで追加」は既存のレシピを上書きしません（同じIDは別IDで追加）。レシピ・グループ単体のファイルも読み込めます。</p>
        {importReport && (
          <ul className="import-report">
            {importReport.map((m, i) => (
              <li key={i} className={i === 0 ? '' : 'small'}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CustomTagsSection({ store, dialog }: { store: Store; dialog: DialogApi }) {
  const { state } = store;
  const [cat, setCat] = useState<CategoryKey>('linework');
  const [prompt, setPrompt] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [note, setNote] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const usedIds = referencedTagIds([...state.workspace.groups, ...state.recipes.flatMap((r) => r.groups), ...state.groups]);

  const submit = () => {
    const p = prompt.trim().replace(/\s+/g, ' ');
    let e = validateCustomPrompt(p);
    if (!e && state.customTags.some((c) => c.prompt.toLowerCase() === p.toLowerCase() && c.id !== editId)) e = '同じ文字列の自作タグがすでにあります';
    if (e) return setErr(e);
    const now = new Date().toISOString();
    if (editId) {
      store.update((s) => ({ ...s, customTags: s.customTags.map((c) => (c.id === editId ? { ...c, category: cat, prompt: p, nameJa: nameJa.trim(), note: note.trim(), updatedAt: now } : c)) }));
      store.toast('自作タグを更新しました');
    } else {
      const c: CustomTag = { id: newId('USR'), category: cat, prompt: p, nameJa: nameJa.trim(), note: note.trim(), createdAt: now, updatedAt: now };
      store.update((s) => ({ ...s, customTags: [...s.customTags, c] }));
      store.toast(`「${c.nameJa || c.prompt}」を${categoryMeta(cat).label}に追加しました`);
    }
    setPrompt('');
    setNameJa('');
    setNote('');
    setEditId(null);
    setErr(null);
  };

  return (
    <div className="shelf-sec">
      <h3>自作タグ</h3>
      <p className="small muted">辞書にない表現（例：delicate thin lineart、thin brown colored outlines）を追加できます。効果は未検証として扱われ、辞書本体は変わりません。</p>
      <div className="form">
        <label>
          カテゴリ
          <select className="text-input" value={cat} onChange={(e) => setCat(e.target.value as CategoryKey)}>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>{META.categories.find((c) => c.key === k)!.label}</option>
            ))}
          </select>
        </label>
        <label>
          英語タグ（出力される文字列）
          <input className="text-input" lang="en" value={prompt} maxLength={100} placeholder="delicate thin lineart" onChange={(e) => { setPrompt(e.target.value); setErr(null); }} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </label>
        <label>
          日本語名（任意）
          <input className="text-input" value={nameJa} maxLength={80} placeholder="繊細な細い線画" onChange={(e) => setNameJa(e.target.value)} />
        </label>
        <label>
          メモ（任意）
          <input className="text-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </label>
        {err && <p className="note-warn small" role="alert">{err}</p>}
        <div className="row-actions">
          <button className="btn btn-primary" onClick={submit}>{editId ? '更新する' : '追加する'}</button>
          {editId && <button className="btn" onClick={() => { setEditId(null); setPrompt(''); setNameJa(''); setNote(''); setErr(null); }}>編集をやめる</button>}
        </div>
      </div>
      {state.customTags.length > 0 && (
        <ul className="shelf-list">
          {state.customTags.map((c) => (
            <li key={c.id}>
              <div className="shelf-item-head">
                <b>{c.nameJa || c.prompt}</b>
                <span className="small muted">
                  <span lang="en">{c.prompt}</span>／{categoryMeta(c.category).label}
                  {usedIds.has(c.id) && '／使用中'}
                </span>
              </div>
              <div className="row-actions">
                <button className="btn btn-small" onClick={() => { setEditId(c.id); setCat(c.category); setPrompt(c.prompt); setNameJa(c.nameJa); setNote(c.note); setErr(null); }}>編集</button>
                <button
                  className="btn btn-small btn-danger-ghost"
                  onClick={async () => {
                    const msg = usedIds.has(c.id)
                      ? `「${c.prompt}」はレシピや調合で使われています。削除すると、それらには「辞書にないタグ」として残り、出力されなくなります。`
                      : `「${c.prompt}」を削除します。`;
                    if (await dialog.confirm('自作タグを削除', msg, '削除', true)) store.update((s) => ({ ...s, customTags: s.customTags.filter((x) => x.id !== c.id) }));
                  }}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
