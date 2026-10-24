// 端末ごとのUI設定（パネルの開閉など）。レシピ・バックアップとは別に保存する
// 例：仕上げディテールを一度開いたら、次回も開いた状態で始まる。レシピを切り替えても開閉は変わらない
import { useSyncExternalStore } from 'react';
import type { DetailType, Layer } from '../core/types';

export const UI_KEY = 'sbw.ui.v1';

export interface UiPrefs {
  /** 仕上げディテール（初回は閉じる） */
  detailOpen: boolean;
  /** 品質調合の詳細設定 */
  qualityAdvancedOpen: boolean;
  detailView: 'basic' | 'all';
  detailType: 'all' | DetailType;
  presetLayer: Layer;
}
export const UI_DEFAULTS: UiPrefs = { detailOpen: false, qualityAdvancedOpen: false, detailView: 'basic', detailType: 'all', presetLayer: 'style' };

function read(): UiPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(UI_KEY) ?? '{}');
    return {
      detailOpen: raw.detailOpen === true,
      qualityAdvancedOpen: raw.qualityAdvancedOpen === true,
      detailView: raw.detailView === 'all' ? 'all' : 'basic',
      detailType: ['density', 'texture', 'finish'].includes(raw.detailType) ? raw.detailType : 'all',
      presetLayer: ['style', 'quality', 'detail'].includes(raw.presetLayer) ? raw.presetLayer : 'style',
    };
  } catch {
    return { ...UI_DEFAULTS };
  }
}

let current: UiPrefs | null = null;
const listeners = new Set<() => void>();
function get(): UiPrefs {
  if (!current) current = read();
  return current;
}
function set(patch: Partial<UiPrefs>) {
  current = { ...get(), ...patch };
  try {
    window.localStorage.setItem(UI_KEY, JSON.stringify(current));
  } catch {
    /* 保存できない環境では、このページを開いている間だけ有効 */
  }
  listeners.forEach((l) => l());
}

export function useUiPrefs(): [UiPrefs, (patch: Partial<UiPrefs>) => void] {
  const prefs = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    get,
  );
  return [prefs, set];
}
