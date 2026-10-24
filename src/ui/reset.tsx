// 調合のリセット：調合画面・出力画面の両方から同じ処理を呼ぶ（共通化）
import { useCallback } from 'react';
import { isMixEmpty, resetMix } from '../core/mix';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

export function useResetMix(store: Store, dialog: DialogApi) {
  return useCallback(async () => {
    if (isMixEmpty(store.state.workspace)) {
      store.toast('調合はすでに空です');
      return false;
    }
    const a = await dialog.ask(
      '現在の調合を空にしますか？',
      <p>選択中のタグとグループ（年タグ・複雑度を含む）を調合から外します。保存済みのレシピと自作タグは削除されません。</p>,
      [
        { value: 'cancel', label: 'キャンセル', tone: 'plain' },
        { value: 'reset', label: 'リセットする', tone: 'danger' },
      ],
    );
    if (a !== 'reset') return false;
    // 1回の更新で行う（保存は自動保存の1回だけ）
    store.updateWorkspace(resetMix);
    store.toast('調合を空にしました。元に戻すことができます。', 'ok', { label: '元に戻す', onClick: store.undo });
    return true;
  }, [store, dialog]);
}
