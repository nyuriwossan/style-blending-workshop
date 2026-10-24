// UI用の状態フック：保存・取り消し（undo）・トースト
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildIndex } from '../core/dictionary';
import type { AppState, Settings, Workspace } from '../core/types';
import { loadState, requestPersist, saveState } from '../storage/persist';

const UNDO_LIMIT = 40;

export interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'warn';
}

export function useAppStore() {
  const initial = useMemo(() => loadState(), []);
  const [state, setState] = useState<AppState>(initial.state);
  const [bootWarnings] = useState<string[]>(initial.warnings);
  const [storageOk, setStorageOk] = useState(!initial.storageUnavailable);
  const undoStack = useRef<Workspace[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 端末内へ自動保存（短い遅延でまとめる）
  useEffect(() => {
    const t = setTimeout(() => setStorageOk(saveState(state)), 250);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    void requestPersist();
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-1), { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), tone === 'warn' ? 5200 : 2600);
  }, []);

  /** ワークスペースを変更（取り消し可能） */
  const updateWorkspace = useCallback((fn: (ws: Workspace) => Workspace) => {
    setState((s) => {
      const next = fn(s.workspace);
      if (next === s.workspace) return s;
      undoStack.current.push(s.workspace);
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
      setUndoCount(undoStack.current.length);
      return { ...s, workspace: next };
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    setUndoCount(undoStack.current.length);
    if (prev) setState((s) => ({ ...s, workspace: prev }));
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const setSettings = useCallback((patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), []);

  const index = useMemo(() => buildIndex(state.customTags), [state.customTags]);

  return { state, index, update, updateWorkspace, undo, undoCount, setSettings, toasts, toast, bootWarnings, storageOk };
}

export type Store = ReturnType<typeof useAppStore>;
