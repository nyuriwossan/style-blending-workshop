// ───────────────────────────────────────────────
// 保存処理：localStorage（端末内）への読み書き
// 読めないデータは消さずに退避し、警告を返す
// ───────────────────────────────────────────────
import { initialState, migrateState } from '../core/schema';
import type { AppState } from '../core/types';

export const STORAGE_KEY = 'sbw.state.v1';
export const PREV_KEY = 'sbw.state.prev';

export interface LoadResult {
  state: AppState;
  warnings: string[];
  /** 保存が使えない（プライベートモード等） */
  storageUnavailable: boolean;
}

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const k = '__sbw_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function loadState(): LoadResult {
  const s = storage();
  if (!s) return { state: initialState(), warnings: ['この環境では端末内保存が使えません（プライベートブラウズ等）。JSONで書き出して保管してください'], storageUnavailable: true };
  let text: string | null = null;
  try {
    text = s.getItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  if (!text) return { state: initialState(), warnings: [], storageUnavailable: false };
  try {
    const m = migrateState(JSON.parse(text));
    if (m.futureVersion) {
      // 新しい版のデータは上書きしないよう、別キーに退避してから初期状態で起動
      try {
        s.setItem(`sbw.state.future.${Date.now()}`, text);
      } catch {
        /* noop */
      }
    }
    return { state: m.state, warnings: m.warnings, storageUnavailable: false };
  } catch {
    try {
      s.setItem(`sbw.state.corrupt.${Date.now()}`, text);
    } catch {
      /* noop */
    }
    return { state: initialState(), warnings: ['保存データを読み込めませんでした。元のデータは別名で退避してあります'], storageUnavailable: false };
  }
}

export function saveState(state: AppState): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** 置き換え系の操作（完全復元など）の直前に、現在の状態を1世代退避する */
export function stashPrevious(state: AppState): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(PREV_KEY, JSON.stringify({ savedAt: new Date().toISOString(), state }));
    return true;
  } catch {
    return false;
  }
}

export function loadPrevious(): { savedAt: string; state: AppState } | null {
  const s = storage();
  if (!s) return null;
  try {
    const t = s.getItem(PREV_KEY);
    if (!t) return null;
    const raw = JSON.parse(t);
    const m = migrateState(raw.state);
    return { savedAt: String(raw.savedAt ?? ''), state: m.state };
  } catch {
    return null;
  }
}

/** 永続化の要求（許可されるかはブラウザ次第） */
export async function requestPersist(): Promise<boolean | null> {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {
    /* noop */
  }
  return null;
}
