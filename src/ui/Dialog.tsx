// 汎用ダイアログ（確認・選択・文字入力）。Promiseで結果を返す
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface DialogAction {
  value: string;
  label: string;
  tone?: 'primary' | 'danger' | 'plain';
}

interface DialogSpec {
  title: string;
  body?: ReactNode;
  actions: DialogAction[];
  input?: { initial: string; placeholder?: string; maxLength?: number };
  resolve: (v: { action: string; text: string } | null) => void;
}

export function useDialog() {
  const [spec, setSpec] = useState<DialogSpec | null>(null);

  const open = useCallback(
    (s: Omit<DialogSpec, 'resolve'>) =>
      new Promise<{ action: string; text: string } | null>((resolve) => setSpec({ ...s, resolve })),
    [],
  );

  const ask = useCallback(
    async (title: string, body: ReactNode, actions: DialogAction[]) => (await open({ title, body, actions }))?.action ?? null,
    [open],
  );

  const confirm = useCallback(
    async (title: string, body: ReactNode, okLabel = 'OK', danger = false) =>
      (await ask(title, body, [
        { value: 'cancel', label: 'やめる', tone: 'plain' },
        { value: 'ok', label: okLabel, tone: danger ? 'danger' : 'primary' },
      ])) === 'ok',
    [ask],
  );

  const promptText = useCallback(
    async (title: string, initial: string, okLabel = '決定', body?: ReactNode) => {
      const r = await open({
        title,
        body,
        input: { initial, maxLength: 80 },
        actions: [
          { value: 'cancel', label: 'やめる', tone: 'plain' },
          { value: 'ok', label: okLabel, tone: 'primary' },
        ],
      });
      if (!r || r.action !== 'ok') return null;
      const t = r.text.trim();
      return t || null;
    },
    [open],
  );

  const element = spec ? <DialogView spec={spec} onClose={() => setSpec(null)} /> : null;
  return { element, ask, confirm, promptText };
}

function DialogView({ spec, onClose }: { spec: DialogSpec; onClose: () => void }) {
  const [text, setText] = useState(spec.input?.initial ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const done = (action: string | null) => {
    spec.resolve(action === null ? null : { action, text });
    onClose();
  };
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else boxRef.current?.querySelector<HTMLButtonElement>('.dlg-actions button:last-child')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="dlg-backdrop" onClick={(e) => e.target === e.currentTarget && done(null)}>
      <div className="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={boxRef}>
        <h2 id="dlg-title">{spec.title}</h2>
        {spec.body && <div className="dlg-body">{spec.body}</div>}
        {spec.input && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              done('ok');
            }}
          >
            <input
              ref={inputRef}
              className="text-input"
              value={text}
              maxLength={spec.input.maxLength}
              placeholder={spec.input.placeholder}
              onChange={(e) => setText(e.target.value)}
            />
          </form>
        )}
        <div className="dlg-actions">
          {spec.actions.map((a) => (
            <button key={a.value} className={`btn ${a.tone === 'primary' ? 'btn-primary' : a.tone === 'danger' ? 'btn-danger' : ''}`} onClick={() => done(a.value)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export type DialogApi = ReturnType<typeof useDialog>;
