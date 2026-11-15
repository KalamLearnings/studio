/**
 * Roll-up findings in Studio (content model CM-S8; CONTENT_MODEL_DESIGN.md
 * 3.3). The backend computes them on read (`GET /curriculum/:id/rollup`,
 * `GET /curriculum/:id/topics/:topicId/rollup`); Studio groups them by
 * activity and says each one in plain language. Pure: no React, no fetch.
 */

import { describeUnitKey, stageLabelText, type LetterLookup } from './units';

export const FINDING_CODES = [
  'undeclared_review',
  'off_focus',
  'no_target',
  'focus_not_covered',
  'prerequisite_untaught',
  'sequence_mismatch',
] as const;
export type FindingCode = (typeof FINDING_CODES)[number];

export interface RollupFinding {
  code: FindingCode;
  scope_type: 'curriculum' | 'topic';
  scope_id: string;
  activity_id?: string;
  unit?: string;
  detail?: Record<string, unknown>;
}

export interface UnitCoverage {
  unit_key: string;
  activities: number;
}

export type FocusSource = 'declared' | 'legacy' | 'none';

export interface TopicRollup {
  topic_id: string;
  sequence_number: number | null;
  type: string | null;
  focus: string[];
  focus_source: FocusSource;
  review: string[];
  prerequisites: string[];
  activities: number;
  coverage: UnitCoverage[];
  findings: RollupFinding[];
}

export interface TopicRollupView extends TopicRollup {
  curriculum_id: string;
  stage: string | null;
  sequence_id: string;
}

export interface LevelRollup {
  curriculum_id: string;
  stage: string | null;
  sequence_id: string;
  objectives: string[];
  prerequisites: string[];
  activities: number;
  coverage: UnitCoverage[];
  findings: RollupFinding[];
  counts: Record<FindingCode, { findings: number; activities: number }>;
  topics: TopicRollup[];
}

/** Short names and how serious each finding is ("note" is not an error). */
export const FINDING_META: Record<FindingCode, { title: string; tone: 'note' | 'warning' }> = {
  undeclared_review: { title: 'Unmarked review', tone: 'note' },
  off_focus: { title: 'Off focus', tone: 'warning' },
  no_target: { title: 'Teaches nothing tracked', tone: 'warning' },
  focus_not_covered: { title: 'Focus not covered', tone: 'warning' },
  prerequisite_untaught: { title: 'Taught too early', tone: 'warning' },
  sequence_mismatch: { title: 'Level order', tone: 'warning' },
};

export interface DescribeContext {
  letter?: LetterLookup;
  /** A level's title by id (for `sequence_mismatch`). */
  levelTitle?: (id: string) => string | undefined;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** One finding as a plain-language sentence. */
export function describeFinding(f: RollupFinding, ctx: DescribeContext = {}): string {
  const unit = f.unit ? describeUnitKey(f.unit, ctx.letter) : 'a unit';
  const d = f.detail ?? {};
  switch (f.code) {
    case 'undeclared_review':
      return `Practises ${unit}, which an earlier topic teaches. This is fine as review: add it to this topic's review list to mark it.`;
    case 'off_focus':
      if (d.where === 'later_in_level') {
        return `Uses ${unit} before the topic that teaches it.`;
      }
      return d.taught_in_earlier_level
        ? `Uses ${unit}, which no topic in this level teaches (an earlier level does).`
        : `Uses ${unit}, which no topic in this level or an earlier level teaches.`;
    case 'no_target':
      return d.evidence === 'none'
        ? 'Teaches no letter or rule. Expected for this activity type (for example a break or narration).'
        : 'Teaches no letter or rule that Studio can see. Check its letters and words.';
    case 'focus_not_covered':
      if (d.role === 'objective') return `No activity in this level teaches the objective ${unit}.`;
      return d.focus_source === 'legacy'
        ? `No activity teaches ${unit}, the topic's letter.`
        : `No activity teaches ${unit}, a declared focus.`;
    case 'prerequisite_untaught': {
      const pre = str(d.prerequisite);
      const preText = pre ? describeUnitKey(pre, ctx.letter) : 'something';
      if (d.assumed) return `This topic assumes ${unit}, but nothing earlier teaches it.`;
      return `${unit} needs ${preText} first, and nothing earlier teaches it.`;
    }
    case 'sequence_mismatch': {
      const stage = stageLabelText(str(d.stage) ?? '');
      const otherId = str(d.other_level) ?? '';
      const other = ctx.levelTitle?.(otherId) ?? 'another level';
      const otherStage = stageLabelText(str(d.other_stage) ?? '');
      const comes = d.other_comes === 'before' ? 'before' : 'after';
      return `This level (${stage}) comes ${comes === 'before' ? 'after' : 'before'} ${other} (${otherStage}), but the teaching sequence puts them the other way round.`;
    }
    default:
      return f.code;
  }
}

export interface ActivityFindings {
  activityId: string;
  findings: RollupFinding[];
}

export interface ScopeFindings {
  scope_type: RollupFinding['scope_type'];
  scope_id: string;
  findings: RollupFinding[];
}

export interface GroupedFindings {
  /** Findings about one activity, activities in first-seen order. */
  byActivity: ActivityFindings[];
  /**
   * Findings about a scope itself (focus, objectives, order, declared
   * prerequisites), one group per level or topic, the level first.
   */
  byScope: ScopeFindings[];
}

/** Group findings by activity; findings with no activity go to their scope. */
export function groupFindings(findings: readonly RollupFinding[]): GroupedFindings {
  const activities = new Map<string, RollupFinding[]>();
  const scopes = new Map<string, ScopeFindings>();
  for (const f of findings) {
    if (!f.activity_id) {
      const key = `${f.scope_type}:${f.scope_id}`;
      const group = scopes.get(key) ?? { scope_type: f.scope_type, scope_id: f.scope_id, findings: [] };
      group.findings.push(f);
      scopes.set(key, group);
      continue;
    }
    const list = activities.get(f.activity_id) ?? [];
    list.push(f);
    activities.set(f.activity_id, list);
  }
  const byScope = Array.from(scopes.values()).sort(
    (a, b) => Number(a.scope_type === 'topic') - Number(b.scope_type === 'topic'),
  );
  return {
    byActivity: Array.from(activities.entries()).map(([activityId, list]) => ({ activityId, findings: list })),
    byScope,
  };
}

/** Per code: findings and distinct activities (the level roll-up sends these; a topic does not). */
export function countFindings(
  findings: readonly RollupFinding[],
): Record<FindingCode, { findings: number; activities: number }> {
  const out = {} as Record<FindingCode, { findings: number; activities: number }>;
  const sets = {} as Record<FindingCode, Set<string>>;
  for (const code of FINDING_CODES) {
    out[code] = { findings: 0, activities: 0 };
    sets[code] = new Set();
  }
  for (const f of findings) {
    if (!out[f.code]) continue;
    out[f.code].findings++;
    if (f.activity_id) sets[f.code].add(f.activity_id);
  }
  for (const code of FINDING_CODES) out[code].activities = sets[code].size;
  return out;
}

/**
 * The declared focus a topic editor starts from: the declared keys, or none
 * when the roll-up fell back to the legacy letter (that letter is shown as a
 * hint, never saved silently).
 */
export function declaredFocus(rollup: Pick<TopicRollup, 'focus' | 'focus_source'>): string[] {
  return rollup.focus_source === 'declared' ? [...rollup.focus] : [];
}

/**
 * A save's `INVALID_TEACHING_TARGETS` details, as messages per target index.
 * In production the backend's error sanitizer spreads the details array into
 * an object (`{ "0": ..., "1": ... }`), so both shapes are read.
 */
export function targetIssuesByIndex(details: unknown): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const items = Array.isArray(details)
    ? details
    : details && typeof details === 'object'
    ? Object.values(details as Record<string, unknown>)
    : [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const { index, message } = item as { index?: unknown; message?: unknown };
    if (typeof index !== 'number' || typeof message !== 'string') continue;
    out.set(index, [...(out.get(index) ?? []), message]);
  }
  return out;
}
