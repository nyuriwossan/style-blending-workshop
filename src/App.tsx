import { useEffect, useMemo, useState } from 'react';
import { profileMeta } from './core/dictionary';
import { countActive, effectiveItems, unknownTagIds } from './core/mix';
import { evaluateRelations } from './core/relations';
import { renderPrompt } from './core/render';
import { useDialog } from './ui/Dialog';
import { MixPanel } from './ui/MixPanel';
import { OutputPanel, ProfileSelect, useCopy } from './ui/OutputPanel';
import { PresetsPanel } from './ui/PresetsPanel';
import { ShelfPanel } from './ui/ShelfPanel';
import { useAppStore } from './ui/store';

type TabKey = 'mix' | 'presets' | 'shelf' | 'output';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'mix', label: '調合' },
  { key: 'presets', label: 'プリセット' },
  { key: 'shelf', label: '保存棚' },
  { key: 'output', label: '出力' },
];

export default function App() {
  const store = useAppStore();
  const dialog = useDialog();
  const { state, index } = store;
  const [tab, setTab] = useState<TabKey>('mix');
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 960px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 960px)');
    const fn = () => setWide(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  useEffect(() => {
    for (const w of store.bootWarnings) store.toast(w, 'warn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effective = useMemo(() => effectiveItems(state.workspace, index, state.settings.order), [state.workspace, index, state.settings.order]);
  const relations = useMemo(() => evaluateRelations(new Set(effective.filter((e) => e.tag).map((e) => e.tagId))), [effective]);
  const result = useMemo(
    () => renderPrompt(effective, state.settings, { years: state.workspace.years, complexity: state.workspace.complexity }),
    [effective, state.settings, state.workspace.years, state.workspace.complexity],
  );
  const unknownIds = useMemo(() => unknownTagIds(state.workspace, index), [state.workspace, index]);
  const activeCount = countActive(state.workspace);
  const copy = useCopy(store);

  const go = (t: TabKey) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  // 広い画面では出力を右側に常設するので、出力タブは調合へ
  const shownTab = wide && tab === 'output' ? 'mix' : tab;

  const output = <OutputPanel store={store} dialog={dialog} result={result} />;

  return (
    <div className={`app ${wide ? 'is-wide' : ''}`}>
      <header className="topbar">
        <h1 className="brand">
          画風調合工房
          <span className="brand-sub">PIXAI・NovelAI</span>
        </h1>
        <div className="topbar-tools">
          {!wide && <ProfileSelect store={store} compact />}
          <button className="btn btn-small" onClick={store.undo} disabled={store.undoCount === 0} aria-label="元に戻す">
            元に戻す
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="画面">
        {TABS.filter((t) => !(wide && t.key === 'output')).map((t) => (
          <button key={t.key} className={shownTab === t.key ? 'on' : ''} aria-current={shownTab === t.key ? 'page' : undefined} onClick={() => go(t.key)}>
            {t.label}
            {t.key === 'mix' && activeCount > 0 && <span className="tab-n">{activeCount}</span>}
          </button>
        ))}
      </nav>

      <div className="layout">
        <main className="main">
          {shownTab === 'mix' && <MixPanel store={store} dialog={dialog} effective={effective} relations={relations} unknownIds={unknownIds} result={result} />}
          {shownTab === 'presets' && <PresetsPanel store={store} dialog={dialog} onApplied={() => go('mix')} />}
          {shownTab === 'shelf' && <ShelfPanel store={store} dialog={dialog} onLoaded={() => go('mix')} />}
          {shownTab === 'output' && output}
          <footer className="foot small muted">
            辞書は再構築版（{index.all.length - state.customTags.length}件）。画像生成での効果検証は未実施です。データはこの端末内だけに保存されます。
          </footer>
        </main>
        {wide && <aside className="side">{output}</aside>}
      </div>

      {!wide && shownTab !== 'output' && (
        <div className="dock">
          <button className="dock-text" onClick={() => go('output')} aria-label="出力画面を開く">
            <span className="dock-meta">
              {profileMeta(state.settings.profile).short}・{activeCount}タグ
              {relations.some((r) => r.bothActive && (r.level === 'strong' || r.level === 'warn')) && <b className="dock-warn">注意あり</b>}
            </span>
            <span className="dock-prompt">{result.style || 'タグを選ぶとプロンプトがここに出ます'}</span>
          </button>
          <button className="btn btn-primary" onClick={() => copy(result.full, 'プロンプト')} disabled={!result.full}>
            コピー
          </button>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {store.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.text}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.onClick();
                  store.dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
      {dialog.element}
    </div>
  );
}
