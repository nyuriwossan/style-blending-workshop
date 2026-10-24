// 品質調合・仕上げディテールの共通操作（プリセット・グループ棚・クリア）
import { applyToLayer, clearLayer, layerDuplicates, newId, type DupPolicy, type ListLayer } from '../core/mix';
import type { MixItem } from '../core/types';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

export const LAYER_NAME: Record<ListLayer, string> = { quality: '品質調合', detail: '仕上げディテール' };

/** タグの組を層に適用する。層が空なら置き換え、空でなければ「置き換え／追加」を選ぶ。重複は値の扱いを選ぶ（加算しない） */
export async function applyItemsToLayer(store: Store, dialog: DialogApi, layer: ListLayer, name: string, items: MixItem[]) {
  const ws = store.state.workspace;
  let mode: 'replace' | 'merge' = 'replace';
  if (ws[layer].length > 0) {
    const a = await dialog.ask(
      `「${name}」を${LAYER_NAME[layer]}に入れる`,
      <p>今の{LAYER_NAME[layer]}（{ws[layer].length}件）をどうしますか。ほかの層（画風など）は変わりません。</p>,
      [
        { value: 'cancel', label: 'やめる', tone: 'plain' },
        { value: 'replace', label: '置き換える' },
        { value: 'merge', label: '今の選択に追加', tone: 'primary' },
      ],
    );
    if (!a || a === 'cancel') return false;
    mode = a as 'replace' | 'merge';
  }
  let policy: DupPolicy = 'keepCurrent';
  if (mode === 'merge') {
    const dups = layerDuplicates(ws, layer, items);
    if (dups.length) {
      const a = await dialog.ask(
        '同じタグがすでにあります',
        <>
          <p>値は足し算しません。どちらの値を使うか選んでください。</p>
          <table className="dup-table">
            <thead>
              <tr>
                <th>タグ</th>
                <th>現在</th>
                <th>追加分</th>
              </tr>
            </thead>
            <tbody>
              {dups.map((d) => (
                <tr key={d.tagId}>
                  <td>{store.index.byId.get(d.tagId)?.nameJa ?? d.tagId}</td>
                  <td>{d.currentOn ? d.current.toFixed(1) : `OFF(${d.current.toFixed(1)})`}</td>
                  <td>{d.preset.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>,
        [
          { value: 'cancel', label: 'やめる', tone: 'plain' },
          { value: 'keepCurrent', label: '現在の値を残す' },
          { value: 'usePreset', label: '追加分の値にする', tone: 'primary' },
        ],
      );
      if (!a || a === 'cancel') return false;
      policy = a as DupPolicy;
    }
  }
  store.updateWorkspace((w) => applyToLayer(w, layer, items, mode, policy));
  store.toast(mode === 'replace' ? `「${name}」を${LAYER_NAME[layer]}に入れました` : `「${name}」を${LAYER_NAME[layer]}に追加しました`, 'ok', { label: '元に戻す', onClick: store.undo });
  return true;
}

export async function saveLayerToShelf(store: Store, dialog: DialogApi, layer: ListLayer) {
  const items = store.state.workspace[layer];
  if (!items.length) return store.toast(`${LAYER_NAME[layer]}にタグがありません`, 'warn');
  const n = await dialog.promptText(`${LAYER_NAME[layer]}をグループ棚に保存`, `${LAYER_NAME[layer]}のセット`, '保存');
  if (!n) return;
  const now = new Date().toISOString();
  store.update((s) => ({ ...s, groups: [{ id: newId('sgp'), name: n, createdAt: now, updatedAt: now, items: items.map((i) => ({ ...i })), layer }, ...s.groups] }));
  store.toast(`「${n}」をグループ棚に保存しました`);
}

export function clearLayerWithUndo(store: Store, layer: ListLayer) {
  if (!store.state.workspace[layer].length) return;
  store.updateWorkspace((w) => clearLayer(w, layer));
  store.toast(`${LAYER_NAME[layer]}を空にしました`, 'ok', { label: '元に戻す', onClick: store.undo });
}
