/**
 * The `phrase` content item in Studio (content model CM-S11; backend CM-B33,
 * ADR 0002 decision 2). Pure: no React, no fetch.
 *
 * A phrase is reviewed word rows in order plus a sentence flag:
 * `{ kind: 'phrase', phrase: { wordIds, isSentence } }`. No Arabic is stored;
 * the reading text is built from the word rows exactly as the server builds
 * it (`phraseText` in the backend's `domain/curriculum/phrase.ts`). The write
 * shape and the length rule are the backend's own schema
 * (`@kalam/curriculum-schemas/server`, synced), so the builder can never
 * produce an item the save would refuse on shape.
 */

import {
  PHRASE_KIND,
  PHRASE_MAX_WORDS,
  PHRASE_MIN_WORDS,
  PhraseRefWriteSchema,
  phraseKey,
  readPhraseItem,
  type PhraseRefWrite,
  SENTENCE_MAX_WORDS,
} from '@kalam/curriculum-schemas/server';

export { PHRASE_MIN_WORDS, phraseKey };

/** The most words a phrase of this kind may hold (the schema's `maxWordsOf`, not exported by the package). */
export function maxWordsOf(isSentence: boolean): number {
  return isSentence ? SENTENCE_MAX_WORDS : PHRASE_MAX_WORDS;
}

export interface PhraseDraft {
  wordIds: string[];
  isSentence: boolean;
}

/** What the builder needs from a word row (`GET /words`). */
export interface PhraseWord {
  id: string;
  arabic: string;
  english?: string | null;
  reviewed_at: string | null;
  retired_at: string | null;
  is_pseudo: boolean;
}

export const EMPTY_PHRASE: PhraseDraft = { wordIds: [], isSentence: false };

/** The words a phrase may use: reviewed, not retired, not a drill (the server's `phrase_words`). */
export function phraseWordChoices<W extends PhraseWord>(words: readonly W[]): W[] {
  return words.filter((w) => phraseWordIssue(w) === null);
}

export type PhraseWordIssue = 'missing' | 'unreviewed' | 'retired' | 'pseudo';

/** Why a word row may not stand in a phrase (mirrors the backend's `phraseWordIssue`), or null. */
export function phraseWordIssue(word: PhraseWord | null | undefined): PhraseWordIssue | null {
  if (!word) return 'missing';
  if (word.is_pseudo) return 'pseudo';
  if (word.retired_at !== null) return 'retired';
  if (word.reviewed_at === null) return 'unreviewed';
  return null;
}

const ISSUE_TEXT: Record<PhraseWordIssue, string> = {
  missing: 'is not in the word bank',
  unreviewed: 'is not reviewed yet',
  retired: 'is retired',
  pseudo: 'is a drill word, not a real word',
};

/**
 * The reading text, right to left: the word rows' spellings in order, one
 * space between, as the server builds it. Null when a word row is missing.
 */
export function phraseReadingText(
  wordIds: readonly string[],
  wordById: (id: string) => Pick<PhraseWord, 'arabic'> | null | undefined,
): string | null {
  const parts: string[] = [];
  for (const id of wordIds) {
    const word = wordById(id);
    if (!word) return null;
    parts.push(word.arabic.normalize('NFC').trim());
  }
  return parts.join(' ');
}

export function addWord(draft: PhraseDraft, wordId: string): PhraseDraft {
  return { ...draft, wordIds: [...draft.wordIds, wordId] };
}

export function removeWordAt(draft: PhraseDraft, index: number): PhraseDraft {
  return { ...draft, wordIds: draft.wordIds.filter((_, i) => i !== index) };
}

/** Moves the word at `from` by `delta` places in reading order; out of range is a no-op. */
export function moveWord(draft: PhraseDraft, from: number, delta: number): PhraseDraft {
  const to = from + delta;
  if (from < 0 || from >= draft.wordIds.length || to < 0 || to >= draft.wordIds.length) return draft;
  const ids = [...draft.wordIds];
  const [id] = ids.splice(from, 1);
  ids.splice(to, 0, id);
  return { ...draft, wordIds: ids };
}

export function setSentence(draft: PhraseDraft, isSentence: boolean): PhraseDraft {
  return { ...draft, isSentence };
}

/** True when one more word fits under the flag's limit. */
export function canAddWord(draft: PhraseDraft): boolean {
  return draft.wordIds.length < maxWordsOf(draft.isSentence);
}

/**
 * What stops the draft from saving, in plain language (empty when it is a
 * valid item): the length rule of the server's schema and each word that is
 * not a reviewed, live, real word.
 */
export function phraseProblems(
  draft: PhraseDraft,
  wordById: (id: string) => PhraseWord | null | undefined,
): string[] {
  const out: string[] = [];
  const max = maxWordsOf(draft.isSentence);
  const n = draft.wordIds.length;
  const what = draft.isSentence ? 'A sentence' : 'A phrase';
  if (n < PHRASE_MIN_WORDS || n > max) {
    out.push(`${what} holds ${PHRASE_MIN_WORDS} to ${max} words (it has ${n}).`);
  }
  draft.wordIds.forEach((id, i) => {
    const word = wordById(id);
    const issue = phraseWordIssue(word);
    if (issue) out.push(`Word ${i + 1} (${word?.arabic ?? id}) ${ISSUE_TEXT[issue]}.`);
  });
  return out;
}

/** The item a save sends, or null while the shape is not valid (the server's write schema decides). */
export function toPhraseItem(draft: PhraseDraft): PhraseRefWrite | null {
  const parsed = PhraseRefWriteSchema.safeParse({
    kind: PHRASE_KIND,
    phrase: { wordIds: [...draft.wordIds], isSentence: draft.isSentence },
  });
  return parsed.success ? parsed.data : null;
}

/** A stored phrase item as a draft (tolerant, as the server reads it); anything else is empty. */
export function fromPhraseItem(value: unknown): PhraseDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_PHRASE };
  const item = readPhraseItem(value as Record<string, unknown>);
  if (item.kind !== PHRASE_KIND) return { ...EMPTY_PHRASE };
  const phrase = item.phrase as { wordIds?: unknown; isSentence?: unknown } | undefined;
  const ids = Array.isArray(phrase?.wordIds)
    ? phrase.wordIds.filter((id): id is string => typeof id === 'string')
    : [];
  return { wordIds: ids, isSentence: phrase?.isSentence === true };
}
