// プリセット：36種の画風プリセットを読み込む（置き換え／追加）
import { useState } from 'react';
import { PRESETS, SLIDER, categoryMeta, profileMeta } from '../core/dictionary';
import { activeGroup, applyPreset, countActive, presetDuplicates, type DupPolicy, type PresetMode } from '../core/mix';
import type { RawPreset } from '../core/types';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

export function PresetsPanel({ store, dialog, onApplied }: { store: Store; dialog: DialogApi; onApplied: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { index } = store;
  const ws = store.state.workspace;
  const hasMix = countActive(ws) > 0 || ws.groups.some((g) => g.items.length > 0);

  const apply = async (p: RawPreset, mode: PresetMode) => {
    let policy: DupPolicy = 'keepCurrent';
    if (mode === 'merge') {
      const dups = presetDuplicates(ws, p);
      if (dups.length) {
        const a = await dialog.ask(
          '同じタグがすでにあります',
          <>
            <p>「{activeGroup(ws).name}」にあるタグと重なっています。値は足し算しません。どちらの値を使うか選んでください。</p>
            <table className="dup-table">
              <thead>
                <tr>
                  <th>タグ</th>
                  <th>現在</th>
                  <th>プリセット</th>
                </tr>
              </thead>
              <tbody>
                {dups.map((d) => (
                  <tr key={d.tagId}>
                    <td>{index.byId.get(d.tagId)?.nameJa ?? d.tagId}</td>
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
            { value: 'usePreset', label: 'プリセットの値にする', tone: 'primary' },
          ],
        );
        if (!a || a === 'cancel') return;
        policy = a as DupPolicy;
      }
    }
    if (mode === 'replace' && hasMix) {
      const ok = await dialog.confirm('今の調合を置き換えます', '現在のグループとタグはすべてこのプリセットに入れ替わります（年タグ・複雑度はそのまま残ります）。直後なら「元に戻す」で戻せます。', '置き換える');
      if (!ok) return;
    }
    store.updateWorkspace((w) => applyPreset(w, p, mode, policy));
    store.toast(mode === 'replace' ? `「${p.name_ja}」を読み込みました` : mode === 'merge' ? `「${p.name_ja}」を編集中のグループに追加しました` : `「${p.name_ja}」を新しいグループとして追加しました`);
    onApplied();
  };

  return (
    <section className="presets">
      <p className="lede">
        よく使う組み合わせの出発点です。読み込んだ後は、スライダーで自由に調整できます。強度は初期値で、最適値ではありません（画像での効果は未検証）。
      </p>
      <ul className="preset-list">
        {PRESETS.map((p) => {
          const open = openId === p.id;
          const items = p.items.map((i) => ({ ...i, tag: index.byId.get(i.tagId) }));
          return (
            <li key={p.id} className={`preset ${open ? 'preset-open' : ''}`}>
              <button className="preset-head" aria-expanded={open} onClick={() => setOpenId(open ? null : p.id)}>
                <span className="preset-strip" aria-hidden>
                  {items.map((i) => (
                    <i key={i.tagId} style={{ flexGrow: i.strength, background: i.tag ? categoryMeta(i.tag.category).color : '#999', opacity: 0.35 + (i.strength / SLIDER.max) * 0.65 }} />
                  ))}
                </span>
                <span className="preset-name">{p.name_ja}</span>
                <span className="preset-en muted" lang="en">{p.name_en}</span>
              </button>
              {open && (
                <div className="preset-body">
                  <ul className="preset-items">
                    {items.map((i) => (
                      <li key={i.tagId}>
                        <i style={{ background: i.tag ? categoryMeta(i.tag.category).color : '#999' }} />
                        <span>{i.tag?.nameJa ?? i.tagId}</span>
                        <span className="muted" lang="en">{i.tag?.prompt}</span>
                        <b>{i.strength.toFixed(1)}</b>
                      </li>
                    ))}
                  </ul>
                  <p className="small">{p.expected_effect_ja}</p>
                  <p className="small muted">{p.cautions_ja}</p>
                  <p className="small muted">想定モデル：{p.recommended_profiles.map((x) => profileMeta(x as never)?.short ?? x).join('、')}</p>
                  <div className="preset-actions">
                    {hasMix ? (
                      <>
                        <button className="btn" onClick={() => apply(p, 'replace')}>置き換える</button>
                        <button className="btn" onClick={() => apply(p, 'merge')}>編集中のグループに追加</button>
                        <button className="btn btn-primary" onClick={() => apply(p, 'newGroup')}>新しいグループで追加</button>
                      </>
                    ) : (
                      <button className="btn btn-primary" onClick={() => apply(p, 'replace')}>このプリセットで始める</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
