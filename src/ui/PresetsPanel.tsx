// プリセット：36種の画風プリセットを読み込む（置き換え／追加）
import { useState } from 'react';
import { DETAIL_PRESETS, PRESETS, QUALITY_AUTO_PRESETS, QUALITY_PRESETS, SLIDER, categoryMeta, profileMeta, type LayerPreset } from '../core/dictionary';
import { applyItemsToLayer, clearLayerWithUndo, LAYER_NAME } from './layerActions';
import { useUiPrefs } from './uiPrefs';
import { activeGroup, applyPreset, countActive, presetDuplicates, type DupPolicy, type PresetMode } from '../core/mix';
import type { MixItem, RawPreset } from '../core/types';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

export function PresetsPanel({ store, dialog, onApplied }: { store: Store; dialog: DialogApi; onApplied: () => void }) {
  const [prefs, setPrefs] = useUiPrefs();
  const tab = prefs.presetLayer;
  return (
    <div>
      <div className="seg seg-wide" role="tablist" aria-label="プリセットの層">
        {(['style', 'quality', 'detail'] as const).map((l) => (
          <button key={l} role="tab" aria-checked={tab === l} aria-selected={tab === l} onClick={() => setPrefs({ presetLayer: l })}>
            {{ style: `画風 ${PRESETS.length}`, quality: `品質 ${QUALITY_PRESETS.length}`, detail: `仕上げ ${DETAIL_PRESETS.length}` }[l]}
          </button>
        ))}
      </div>
      {tab === 'style' && <StylePresets store={store} dialog={dialog} onApplied={onApplied} />}
      {tab === 'quality' && <QualityPresets store={store} dialog={dialog} onApplied={onApplied} />}
      {tab === 'detail' && <DetailPresets store={store} dialog={dialog} onApplied={onApplied} />}
    </div>
  );
}

function LayerPresetList({ store, dialog, onApplied, layer, presets }: { store: Store; dialog: DialogApi; onApplied: () => void; layer: 'quality' | 'detail'; presets: LayerPreset[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { index } = store;
  return (
    <ul className="preset-list">
      {presets.map((p) => {
        const open = openId === p.id;
        const items = p.items.map((i) => ({ ...i, tag: index.byId.get(i.tagId) }));
        return (
          <li key={p.id} className={`preset ${open ? 'preset-open' : ''}`}>
            <button className="preset-head" aria-expanded={open} onClick={() => setOpenId(open ? null : p.id)}>
              <span className="preset-strip" aria-hidden>
                {items.length ? (
                  items.map((i) => (
                    <i key={i.tagId} style={{ flexGrow: i.strength, background: i.tag ? categoryMeta(i.tag.category).color : '#999', opacity: 0.35 + (i.strength / SLIDER.max) * 0.65 }} />
                  ))
                ) : (
                  <i style={{ flexGrow: 1, background: 'var(--line)' }} />
                )}
              </span>
              <span className="preset-name">{p.name_ja}</span>
              <span className="preset-en muted">{p.kind === 'clear' ? 'この層を空にする' : `${items.length}タグ`}</span>
            </button>
            {open && (
              <div className="preset-body">
                {items.length > 0 && (
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
                )}
                <p className="small">{p.description_ja}</p>
                {p.recommended_profiles && <p className="small muted">想定モデル：{p.recommended_profiles.map((x) => profileMeta(x)?.short ?? x).join('、')}</p>}
                <p className="small muted">強度は出発点で、効果は未検証です。ほかの層の選択はそのまま残ります。</p>
                <div className="preset-actions">
                  {p.kind === 'clear' ? (
                    <button className="btn btn-primary" onClick={() => { clearLayerWithUndo(store, layer); onApplied(); }} disabled={!store.state.workspace[layer].length}>
                      {LAYER_NAME[layer]}を空にする
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        if (await applyItemsToLayer(store, dialog, layer, p.name_ja, p.items.map((i): MixItem => ({ tagId: i.tagId, strength: i.strength, on: true })))) onApplied();
                      }}
                    >
                      {LAYER_NAME[layer]}に使う
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function QualityPresets({ store, dialog, onApplied }: { store: Store; dialog: DialogApi; onApplied: () => void }) {
  const s = store.state.settings;
  return (
    <section className="presets">
      <p className="lede">品質調合の出発点です。下の「手動で出力するセット」はアプリの出力にタグを加えます。サービス側の自動品質タグとは別物です。</p>
      <h3 className="preset-sec-title">手動で出力するセット</h3>
      <LayerPresetList store={store} dialog={dialog} onApplied={onApplied} layer="quality" presets={QUALITY_PRESETS} />
      <h3 className="preset-sec-title">サービス側の自動品質タグ（設定の記録だけ）</h3>
      <p className="small muted">NovelAIの「品質タグ追加」をどうしているかを記録します。アプリの出力には何も加えず、手動で選んだタグとの重複だけを知らせます。</p>
      <ul className="auto-presets">
        {QUALITY_AUTO_PRESETS.map((p) => (
          <li key={p.id}>
            <button className={`btn ${s.naiAutoQuality === p.autoSetting ? 'btn-primary' : ''}`} aria-pressed={s.naiAutoQuality === p.autoSetting} onClick={() => { store.setSettings({ naiAutoQuality: p.autoSetting! }); store.toast(`記録しました：${p.name_ja}`); }}>
              {p.name_ja}
            </button>
            <p className="small muted">{p.description_ja}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DetailPresets({ store, dialog, onApplied }: { store: Store; dialog: DialogApi; onApplied: () => void }) {
  return (
    <section className="presets">
      <p className="lede">仕上げディテールの出発点です。目・髪・肌・唇・布地の描き込みと質感を整えます。人物の形や色は指定しません。</p>
      <LayerPresetList store={store} dialog={dialog} onApplied={onApplied} layer="detail" presets={DETAIL_PRESETS} />
    </section>
  );
}

function StylePresets({ store, dialog, onApplied }: { store: Store; dialog: DialogApi; onApplied: () => void }) {
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
        画風のよく使う組み合わせの出発点です。品質・仕上げディテールの選択には影響しません。読み込んだ後は、スライダーで自由に調整できます。強度は初期値で、最適値ではありません（画像での効果は未検証）。
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
