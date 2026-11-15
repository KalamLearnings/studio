/**
 * Decodability findings in Studio (content model CM-S11; backend CM-B34, ADR
 * 0002 section 3). The backend computes them on read: a story node's book in
 * the level and topic roll-up (`story_decodability`), a phrase item at save
 * (`decodable`). Studio groups them by failing word and says each in plain
 * language. They are warnings for people: nothing here blocks a save.
 * Pure: no React, no fetch.
 *
 * Mirrors `DecodabilityReport` of the backend's
 * `domain/teaching-targets/decodability.ts` and `StoryDecodability` of
 * `application/curriculum/decodability.ts`.
 */

import { describeUnitKey, stageLabelText, type LetterLookup } from './units';

export type DecodabilityScope = 'phrase' | 'sentence' | 'story';

export type DecodabilityFindingCode =
  | 'prerequisite_untaught'
  | 'word_unknown'
  | 'free_arabic_text'
  | 'no_teaching_point';

/** `preview`: a later topic, node or level teaches it; `untaught`: nothing in this curriculum does yet. */
export type UntaughtRelation = 'preview' | 'untaught';

export interface DecodabilityFinding {
  code: DecodabilityFindingCode;
  wordId?: string;
  text?: string;
  positions?: number[];
  unit?: string;
  relation?: UntaughtRelation;
  stage?: string | null;
  heartWord?: string;
  path?: string;
  message: string;
}

export interface HeartWordUse {
  wordId: string;
  heartWord: string;
  kind: 'early' | 'irregular';
}

export interface DecodabilityReport {
  scope: DecodabilityScope;
  sequenceId: string;
  pointStage: string | null;
  decodable: boolean;
  heartWords: HeartWordUse[];
  findings: DecodabilityFinding[];
}

/** One story node's book, checked at the node; `report` is null when the book has no reader source. */
export interface StoryDecodability {
  node_id: string;
  topic_id: string | null;
  book_id: string;
  report: DecodabilityReport | null;
}

/** One unit a failing word needs that is not taught at the point. */
export interface MissingUnit {
  unit: string;
  relation: UntaughtRelation | null;
  stage: string | null;
}

/** A failing word with every unit it is missing, words in first-seen order. */
export interface FailingWord {
  wordId: string;
  text: string;
  positions: number[];
  heartWord: string | null;
  missing: MissingUnit[];
}

export interface GroupedDecodability {
  words: FailingWord[];
  /** Findings that are not about a taught unit: unknown words, typed Arabic, no teaching point. */
  other: DecodabilityFinding[];
}

/** Group `prerequisite_untaught` findings by word (the backend sends one per word and unit). */
export function groupDecodability(findings: readonly DecodabilityFinding[]): GroupedDecodability {
  const byWord = new Map<string, FailingWord>();
  const other: DecodabilityFinding[] = [];
  for (const f of findings) {
    if (f.code !== 'prerequisite_untaught' || !f.wordId || !f.unit) {
      other.push(f);
      continue;
    }
    const word = byWord.get(f.wordId) ?? {
      wordId: f.wordId,
      text: f.text ?? f.wordId,
      positions: f.positions ?? [],
      heartWord: f.heartWord ?? null,
      missing: [],
    };
    if (!word.missing.some((m) => m.unit === f.unit)) {
      word.missing.push({ unit: f.unit, relation: f.relation ?? null, stage: f.stage ?? null });
    }
    byWord.set(f.wordId, word);
  }
  return { words: Array.from(byWord.values()), other };
}

/** The relation in plain language. */
export function relationText(relation: UntaughtRelation | null): string {
  if (relation === 'preview') return 'a later lesson teaches it';
  if (relation === 'untaught') return 'nothing in this curriculum teaches it yet';
  return 'not taught by this point';
}

/** One missing unit: "ب (Ba) with kasra: a later lesson teaches it (stage Kasra)". */
export function describeMissingUnit(m: MissingUnit, lookup?: LetterLookup): string {
  const stage = m.stage ? ` (stage ${stageLabelText(m.stage)})` : '';
  return `${describeUnitKey(m.unit, lookup)}: ${relationText(m.relation)}${stage}`;
}

/** A finding that is not about a unit, in plain language. */
export function describeOtherFinding(f: DecodabilityFinding): string {
  switch (f.code) {
    case 'word_unknown':
      return `Word ${f.wordId ?? '(no id)'} is not in the word bank, so it cannot be checked.`;
    case 'free_arabic_text':
      return `"${f.text ?? ''}"${f.path ? ` at ${f.path}` : ''} is typed Arabic, not a linked word-bank word. A story is checked only when every Arabic word is linked.`;
    case 'no_teaching_point':
      return 'This is in no topic, so nothing is taught there.';
    default:
      return f.message;
  }
}

/** The headline of one report. */
export function decodabilitySummary(report: DecodabilityReport | null): string {
  if (!report) return 'The book has no saved reader source, so there is nothing to check.';
  if (report.decodable) {
    return report.heartWords.length > 0
      ? `Decodable here, with ${report.heartWords.length} heart word${report.heartWords.length === 1 ? '' : 's'} excused.`
      : 'Decodable here: every word uses only what is taught by this point.';
  }
  const { words, other } = groupDecodability(report.findings);
  const parts: string[] = [];
  if (words.length > 0) parts.push(`${words.length} word${words.length === 1 ? '' : 's'} use what is not taught yet`);
  if (other.length > 0) parts.push(`${other.length} other problem${other.length === 1 ? '' : 's'}`);
  return `Not decodable here: ${parts.join(', ')}.`;
}

/**
 * A note when no level is labelled with a stage: then no stage counts as
 * taught, so nearly every word warns (backend CM-B34, open item 3).
 */
export function pointStageNote(report: DecodabilityReport | null): string | null {
  if (!report || report.pointStage !== null || report.decodable) return null;
  return 'No level up to here has a stage label, so no stage counts as taught. Set the level stage to check against it.';
}

/** Story nodes whose book is not decodable come first, then the rest, each in the roll-up's order. */
export function sortStories(stories: readonly StoryDecodability[]): StoryDecodability[] {
  const failing = (s: StoryDecodability) => (s.report && !s.report.decodable ? 0 : 1);
  return stories
    .map((s, i) => ({ s, i }))
    .sort((a, b) => failing(a.s) - failing(b.s) || a.i - b.i)
    .map(({ s }) => s);
}
