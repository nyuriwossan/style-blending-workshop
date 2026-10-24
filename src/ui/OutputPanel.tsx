// プロンプト出力：モデル切替・プレビュー・コピー・カテゴリ別コピー・リセット
import { META, categoryMeta, layerMeta, profileMeta } from '../core/dictionary';
import { autoQualityInfo } from '../core/autoQuality';
import type { Layer } from '../core/types';
import { DEDUPE_RULE_LABEL, isActive, isMixEmpty } from '../core/mix';
import { useResetMix } from './reset';
import { JOINER, isPixai, isTsubaki, syntaxDescription, type RenderResult } from '../core/render';
import type { DedupeRule, ProfileId } from '../core/types';
import { copyText } from '../storage/files';
import type { DialogApi } from './Dialog';
import type { Store } from './store';

export function ProfileSelect({ store, compact = false }: { store: Store; compact?: boolean }) {
  return (
    <label className={compact ? 'profile-select compact' : 'profile-select'}>
      {!compact && <span className="small muted">出力先</span>}
      <select
        className="text-input"
        value={store.state.settings.profile}
        aria-label="出力先のモデル"
        onChange={(e) => store.setSettings({ profile: e.target.value as ProfileId })}
      >
        <optgroup label="PIXAI">
          {META.profiles.filter((p) => p.family === 'pixai').map((p) => (
            <option key={p.id} value={p.id}>{compact ? p.short : p.label}</option>
          ))}
        </optgroup>
        <optgroup label="NovelAI">
          {META.profiles.filter((p) => p.family === 'nai').map((p) => (
            <option key={p.id} value={p.id}>{compact ? p.short : p.label}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

export function useCopy(store: Store) {
  return async (text: string, what: string) => {
    if (!text) return store.toast('コピーする内容がありません', 'warn');
    const ok = await copyText(text);
    store.toast(ok ? `${what}をコピーしました` : 'コピーできませんでした。プレビューを長押しして選択してください', ok ? 'ok' : 'warn');
  };
}

export function OutputPanel({ store, dialog, result }: { store: Store; dialog: DialogApi; result: RenderResult }) {
  const { settings, workspace } = store.state;
  const auto = autoQualityInfo(
    settings,
    workspace.quality.filter(isActive).map((i) => store.index.byId.get(i.tagId)?.prompt).filter((p): p is string => !!p),
  );
  const join = (...ls: Layer[]) => result.order.filter((l) => ls.includes(l)).map((l) => result[l]).filter(Boolean).join(JOINER);
  const partCopies = [
    { label: '画風だけ', text: result.style },
    { label: '品質だけ', text: result.quality },
    { label: '仕上げだけ', text: result.detail },
    { label: '画風＋仕上げ', text: join('style', 'detail') },
    { label: '画風＋品質＋仕上げ', text: result.combined },
  ];
  const copy = useCopy(store);
  const reset = useResetMix(store, dialog);
  const pm = profileMeta(settings.profile);
  const hasPerson = settings.personPrompt.trim().length > 0;

  return (
    <section className="output" aria-label="プロンプト出力">
      <div className="output-head">
        <ProfileSelect store={store} />
        {pm.experimental && <span className="badge badge-warn">実験的</span>}
      </div>
      <p className="small muted syntax">{syntaxDescription(settings.profile, settings)}</p>

      <div className="preview-wrap">
        <pre className="preview" aria-label="プロンプトのプレビュー" tabIndex={0}>
          {result.full || <span className="muted">タグを選ぶと、ここにプロンプトが表示されます。</span>}
        </pre>
        <div className="row-actions">
          <button className="btn btn-primary" onClick={() => copy(result.full, hasPerson ? '人物＋全体のプロンプト' : 'プロンプト全体')} disabled={!result.full}>
            全体をコピー
          </button>
        </div>
        <div className="copy-menu" role="group" aria-label="部分コピー">
          <span className="small muted">部分コピー：</span>
          {partCopies.map((c) => (
            <button key={c.label} className="chip chip-copy" onClick={() => copy(c.text, c.label)} disabled={!c.text}>
              {c.label}
            </button>
          ))}
        </div>
        <p className="small muted layer-order-note">
          並び：{result.order.map((l) => layerMeta(l).short).join(' → ')}
          {settings.qualityPosition === 'auto' && (isPixai(settings.profile) ? '（PIXAIは品質タグを先頭に置く定番の書き方）' : '（NovelAIは自動品質タグと同じく品質タグを末尾に）')}
        </p>
      </div>

      {(result.warnings.length > 0 || auto.notes.length > 0) && (
        <ul className="out-warnings">
          {[...auto.notes, ...result.warnings].map((w, i) => (
            <li key={i} className="small">{w}</li>
          ))}
        </ul>
      )}

      {result.byCategory.length > 0 && (
        <div className="by-cat">
          <h3>カテゴリ別</h3>
          <ul>
            {result.byCategory.map((c) => {
              const m = c.category === 'special' ? null : categoryMeta(c.category);
              const label = m?.label ?? '年代・複雑度';
              return (
                <li key={c.category} style={{ ['--cat' as string]: m?.color ?? 'var(--ink-2)' }}>
                  <div className="by-cat-head">
                    <span className="cat-swatch" aria-hidden />
                    <span className={`layer-tag layer-tag-${c.layer}`}>{layerMeta(c.layer).short}</span>
                    <b>{label}</b>
                    <span className="muted small">{c.count}</span>
                    <button className="btn btn-small" onClick={() => copy(c.text, label)}>コピー</button>
                  </div>
                  <code>{c.text}</code>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <details className="opts" open={hasPerson}>
        <summary>人物プロンプトと組み合わせる</summary>
        <p className="small muted">ここに入れた文章は書き換えません。{settings.profile.startsWith('nai_v4') || settings.profile.startsWith('nai_v5') ? 'NovelAI V4以降では、画風はベースプロンプト、人物はキャラクタープロンプトに分ける使い方もあります。' : ''}</p>
        <textarea
          className="text-input"
          rows={3}
          value={settings.personPrompt}
          placeholder="例：1boy, short black hair, upper body"
          onChange={(e) => store.setSettings({ personPrompt: e.target.value })}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="seg" role="radiogroup" aria-label="人物プロンプトの位置">
          <button role="radio" aria-checked={settings.personPosition === 'before'} onClick={() => store.setSettings({ personPosition: 'before' })}>人物を前に</button>
          <button role="radio" aria-checked={settings.personPosition === 'after'} onClick={() => store.setSettings({ personPosition: 'after' })}>画風を前に</button>
        </div>
      </details>

      <details className="opts">
        <summary>出力の設定</summary>
        <div className="opt-row">
          <span>並び順</span>
          <div className="seg" role="radiogroup" aria-label="並び順">
            <button role="radio" aria-checked={settings.order === 'category'} onClick={() => store.setSettings({ order: 'category' })}>カテゴリ順</button>
            <button role="radio" aria-checked={settings.order === 'mix'} onClick={() => store.setSettings({ order: 'mix' })}>選んだ順</button>
          </div>
        </div>
        <div className="opt-row">
          <span>同じタグが複数グループにあるとき</span>
          <select
            className="text-input"
            value={workspace.dedupeRule}
            onChange={(e) => store.updateWorkspace((w) => ({ ...w, dedupeRule: e.target.value as DedupeRule }))}
          >
            {(Object.keys(DEDUPE_RULE_LABEL) as DedupeRule[]).map((k) => (
              <option key={k} value={k}>{DEDUPE_RULE_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <p className="small muted">同じタグは1回だけ出力し、値は足し算しません（品質と仕上げの両方で選んだタグも1回だけ）。意味が似ている別のタグはまとめません。</p>
        <div className="opt-row">
          <span>品質タグの位置</span>
          <div className="seg" role="radiogroup" aria-label="品質タグの位置">
            <button role="radio" aria-checked={settings.qualityPosition === 'auto'} onClick={() => store.setSettings({ qualityPosition: 'auto' })}>おまかせ</button>
            <button role="radio" aria-checked={settings.qualityPosition === 'start'} onClick={() => store.setSettings({ qualityPosition: 'start' })}>先頭</button>
            <button role="radio" aria-checked={settings.qualityPosition === 'end'} onClick={() => store.setSettings({ qualityPosition: 'end' })}>末尾</button>
          </div>
        </div>
        <p className="small muted">おまかせ：PIXAIは先頭（公式の定番 masterpiece, best quality, high detail の書き方）、NovelAIは末尾（NovelAIの「品質タグ追加」も末尾に付く。画風タグは先頭寄りが推奨）。</p>
        {settings.profile === 'pixai_sdxl' && (
          <label className="check">
            <input type="checkbox" checked={settings.sdxlClamp} onChange={(e) => store.setSettings({ sdxlClamp: e.target.checked })} />
            1.5を超える値を1.5に丸める（推奨）
          </label>
        )}
        {isTsubaki(settings.profile) && (
          <label className="check">
            <input type="checkbox" checked={settings.tsubakiNumeric} onChange={(e) => store.setSettings({ tsubakiNumeric: e.target.checked })} />
            実験：数値ウェイトで出力する（公式の構文仕様・効き方は未確認）
          </label>
        )}
        {isTsubaki(settings.profile) && !settings.tsubakiNumeric && (
          <label className="check">
            <input type="checkbox" checked={settings.tsubakiDetailNL} onChange={(e) => store.setSettings({ tsubakiDetailNL: e.target.checked })} />
            仕上げディテールを自然文テンプレートで出力する（実験的。OFFにすると短いタグ形式）
          </label>
        )}
        {isPixai(settings.profile) && (
          <label className="check">
            <input type="checkbox" checked={settings.pixaiYears} onChange={(e) => store.setSettings({ pixaiYears: e.target.checked })} />
            実験：年タグ（year 2024 など）もPIXAI向けに出力する（NovelAI公式のタグで、PIXAIでの効果は未確認）
          </label>
        )}
        {isPixai(settings.profile) && <p className="small muted">PIXAI向けでは「adult」「bust」を含む表現を出力しません。ネガティブプロンプトは作りません。</p>}
      </details>

      <p className="small muted disclaimer">
        スライダーの値は、画像上の効果の大きさそのものではありません。同じ数値でも、モデルが違えば効き方は変わります。収録タグはすべて、画像生成での効果を検証していません。
      </p>

      <div className="row-actions danger-zone">
        <button className="btn btn-danger-ghost" disabled={isMixEmpty(workspace)} onClick={() => void reset()}>
          調合をリセット
        </button>
      </div>
    </section>
  );
}
