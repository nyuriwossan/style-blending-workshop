// ───────────────────────────────────────────────
// タグ関係の判定：conflict_rules.json に定義された関係だけを使う
// 未定義の関係は推定しない。警告は出すが選択は消さない。
// ───────────────────────────────────────────────
import { META, RULES } from './dictionary';
import type { RawRule, RelationType } from './types';

export interface RelationHit {
  rule: RawRule;
  type: RelationType;
  label: string;
  level: 'info' | 'suggest' | 'warn' | 'strong';
  /** 両方が選択されている */
  bothActive: boolean;
  /** 片方のみ選択されている場合、選ばれていない側のID */
  missing?: string;
}

export function relationLabel(type: string) {
  return META.relationTypes[type] ?? { label: type, level: 'info' as const };
}

/**
 * 選択中（実効）のタグID集合に対して関係を評価する。
 * - 両方選択：排他的・競合・条件付き・相乗をすべて返す
 * - 片方のみ：相乗（suggest_optional_pair）だけを提案として返す
 */
export function evaluateRelations(activeIds: Set<string>, rules: RawRule[] = RULES): RelationHit[] {
  const hits: RelationHit[] = [];
  for (const rule of rules) {
    const [a, b] = rule.tagIds;
    const hasA = activeIds.has(a);
    const hasB = activeIds.has(b);
    const meta = relationLabel(rule.type);
    if (hasA && hasB) {
      hits.push({ rule, type: rule.type, label: meta.label, level: meta.level, bothActive: true });
    } else if ((hasA || hasB) && meta.level === 'suggest') {
      hits.push({ rule, type: rule.type, label: meta.label, level: meta.level, bothActive: false, missing: hasA ? b : a });
    }
  }
  const order = { strong: 0, warn: 1, info: 2, suggest: 3 } as const;
  return hits.sort((x, y) => order[x.level] - order[y.level] || x.rule.id.localeCompare(y.rule.id));
}

/** あるタグに関係する全ルール（詳細表示用。選択状態を問わない） */
export function rulesForTag(tagId: string, rules: RawRule[] = RULES): RawRule[] {
  return rules.filter((r) => r.tagIds.includes(tagId));
}

export function relationCounts(rules: RawRule[] = RULES): Record<string, number> {
  const out: Record<string, number> = { synonym: 0, similar: 0, complement: 0, synergy: 0, conflict: 0, exclusive: 0, conditional: 0 };
  for (const r of rules) out[r.type] = (out[r.type] ?? 0) + 1;
  return out;
}
