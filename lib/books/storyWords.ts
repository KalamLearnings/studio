/**
 * Arabic words in storybooks (content model N11, CM-S10; design 2.16;
 * backend BOOK_READER_CONTRACT.md "Arabic words in storybooks").
 *
 * In a book reader source an Arabic word is the token `{{word:<wordId>}}`, a
 * reference to one `curriculum_words` row; the server writes the word's
 * spelling in its place in every edition. This module is the Studio side of
 * that rule, pure and transport-free:
 *
 * - finds the Arabic-script runs that are not tokens yet, at the same
 *   locations the backend reports (`edition.pages[2].text`);
 * - matches each run to the word bank as `saveWord` would (exact, then the
 *   normalised spelling; `previewWordSpelling`, CM-S1);
 * - writes the author's confirmed links into the source as tokens;
 * - reads the source route's `warnings` and its `READER_WORDS_INVALID` issues
 *   so the editor can show them at their locations.
 */

import { previewWordSpelling, type SpellingPreview, type SpellingWord } from "../words/spelling";

/** A word id inside a token: the backend's `curriculum_words.id` alphabet. */
const WORD_ID = "[A-Za-z0-9_-]{1,100}";
const WORD_TOKEN = new RegExp(`\\{\\{word:(${WORD_ID})\\}\\}`, "g");
/** Arabic-script characters, as the backend's publish check reads them. */
const ARABIC_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+/g;

export const READER_WORDS_INVALID = "READER_WORDS_INVALID";

/** The token for a word. */
export function wordToken(wordId: string): string {
  return `{{word:${wordId}}}`;
}

/** The word ids of the tokens in `text`, in order, repeats included. */
export function wordTokenIds(text: string): string[] {
  return Array.from(text.matchAll(WORD_TOKEN), (m) => m[1]);
}

/** The parts of a reader source (`PublishReader`) that hold author text. */
export interface StorySource {
  edition: {
    title: string;
    pages: Array<{ text: string; illustration?: { alt: string } | null }>;
  };
  assessment?: {
    questions: Array<{ prompt: string; choices: Array<{ text: string }> }>;
  } | null;
}

/** One text of the source and its location, in the backend's item path form. */
export interface StoryText {
  path: string;
  text: string;
}

/** Every non-blank text of the source, in reading order, as the backend walks them. */
export function storyTexts(source: StorySource): StoryText[] {
  const out: StoryText[] = [];
  const add = (path: string, text: string | undefined) => {
    if (text && text.trim()) out.push({ path, text });
  };
  add("edition.title", source.edition.title);
  source.edition.pages.forEach((page, i) => {
    add(`edition.pages[${i}].text`, page.text);
    if (page.illustration) add(`edition.pages[${i}].illustration.alt`, page.illustration.alt);
  });
  (source.assessment?.questions ?? []).forEach((q, i) => {
    add(`assessment.questions[${i}].prompt`, q.prompt);
    q.choices.forEach((c, j) => add(`assessment.questions[${i}].choices[${j}].text`, c.text));
  });
  return out;
}

/** An author-facing name for a location. */
export function storyPathLabel(path: string): string {
  let m: RegExpMatchArray | null;
  if (path === "edition.title") return "Title";
  if ((m = path.match(/^edition\.pages\[(\d+)\]\.text$/))) return `Page ${Number(m[1]) + 1} text`;
  if ((m = path.match(/^edition\.pages\[(\d+)\]\.illustration\.alt$/))) {
    return `Page ${Number(m[1]) + 1} alt text`;
  }
  if ((m = path.match(/^assessment\.questions\[(\d+)\]\.prompt$/))) return `Question ${Number(m[1]) + 1}`;
  if ((m = path.match(/^assessment\.questions\[(\d+)\]\.choices\[(\d+)\]\.text$/))) {
    return `Question ${Number(m[1]) + 1}, choice ${Number(m[2]) + 1}`;
  }
  return path;
}

/** An Arabic-script run that is not a token yet: end-exclusive UTF-16 offsets. */
export interface ArabicRun {
  text: string;
  start: number;
  end: number;
}

/** The Arabic-script runs of `text` outside its tokens. */
export function arabicRuns(text: string): ArabicRun[] {
  const runs: ArabicRun[] = [];
  let last = 0;
  const scan = (from: number, to: number) => {
    for (const m of Array.from(text.slice(from, to).matchAll(ARABIC_RUN))) {
      const start = from + m.index!;
      runs.push({ text: m[0], start, end: start + m[0].length });
    }
  };
  for (const m of Array.from(text.matchAll(WORD_TOKEN))) {
    scan(last, m.index!);
    last = m.index! + m[0].length;
  }
  scan(last, text.length);
  return runs;
}

/** A library row as the matcher reads it; retired rows are never offered. */
export interface StoryBankWord extends SpellingWord {
  retired_at?: string | null;
}

/** One unlinked run at its location, with what the word bank has for it. */
export interface UnlinkedWord<W extends StoryBankWord> extends ArabicRun {
  path: string;
  /** exact / reuse: the row to confirm; new: the word to create; invalid: not a spelling. */
  match: SpellingPreview<W>;
}

/** Every unlinked Arabic run of the source, in reading order, each matched to the bank. */
export function unlinkedWords<W extends StoryBankWord>(
  source: StorySource,
  words: readonly W[],
): UnlinkedWord<W>[] {
  const live = words.filter((w) => !w.retired_at);
  const cache = new Map<string, SpellingPreview<W>>();
  const out: UnlinkedWord<W>[] = [];
  for (const { path, text } of storyTexts(source)) {
    for (const run of arabicRuns(text)) {
      let match = cache.get(run.text);
      if (!match) {
        match = previewWordSpelling(run.text, live)!;
        cache.set(run.text, match);
      }
      out.push({ ...run, path, match });
    }
  }
  return out;
}

/** The unlinked runs grouped by their text, so one confirmation links every place. */
export interface UnlinkedGroup<W extends StoryBankWord> {
  text: string;
  match: SpellingPreview<W>;
  paths: string[];
}

export function groupUnlinked<W extends StoryBankWord>(
  items: readonly UnlinkedWord<W>[],
): UnlinkedGroup<W>[] {
  const groups = new Map<string, UnlinkedGroup<W>>();
  for (const item of items) {
    const group = groups.get(item.text) ?? { text: item.text, match: item.match, paths: [] };
    if (!group.paths.includes(item.path)) group.paths.push(item.path);
    groups.set(item.text, group);
  }
  return Array.from(groups.values());
}

/** Replaces every run of exactly `runText` in `text` (outside tokens) with the word's token. */
export function linkRunInText(text: string, runText: string, wordId: string): string {
  const runs = arabicRuns(text).filter((r) => r.text === runText);
  let out = text;
  for (const run of runs.reverse()) {
    out = out.slice(0, run.start) + wordToken(wordId) + out.slice(run.end);
  }
  return out;
}

/** A copy of the source with `fn` applied to every author text. */
function mapTexts<S extends StorySource>(source: S, fn: (text: string) => string): S {
  return {
    ...source,
    edition: {
      ...source.edition,
      title: fn(source.edition.title),
      pages: source.edition.pages.map((page) => ({
        ...page,
        text: fn(page.text),
        ...(page.illustration ? { illustration: { ...page.illustration, alt: fn(page.illustration.alt) } } : {}),
      })),
    },
    ...(source.assessment
      ? {
          assessment: {
            ...source.assessment,
            questions: source.assessment.questions.map((q) => ({
              ...q,
              prompt: fn(q.prompt),
              choices: q.choices.map((c) => ({ ...c, text: fn(c.text) })),
            })),
          },
        }
      : {}),
  };
}

/** The author confirmed `wordId` for `runText`: every such run in the source becomes its token. */
export function linkWordInSource<S extends StorySource>(source: S, runText: string, wordId: string): S {
  return mapTexts(source, (text) => linkRunInText(text, runText, wordId));
}

/** Unlinks a word: its tokens go back to the given spelling (so the author can relink it). */
export function unlinkWordInSource<S extends StorySource>(source: S, wordId: string, spelling: string): S {
  return mapTexts(source, (text) => text.split(wordToken(wordId)).join(spelling));
}

/** The word ids the source's tokens name, repeats removed, in first-use order. */
export function linkedWordIds(source: StorySource): string[] {
  return Array.from(new Set(storyTexts(source).flatMap((t) => wordTokenIds(t.text))));
}

/** A text with each token shown as its word's spelling (an unknown id stays a token). */
export function displayStoryText(text: string, spellingOf: (wordId: string) => string | undefined): string {
  return text.replace(WORD_TOKEN, (token, id: string) => spellingOf(id) ?? token);
}

/** A source-route issue or warning at its location (backend `StoryWordIssue`). */
export type StoryWordIssue =
  | { code: "arabic_text"; path: string; text: string }
  | { code: "malformed_token"; path: string }
  | { code: "unknown_word"; path: string; wordId: string }
  | { code: "retired_word"; path: string; wordId: string };

const ISSUE_CODES = new Set(["arabic_text", "malformed_token", "unknown_word", "retired_word"]);

function isStoryWordIssue(v: unknown): v is StoryWordIssue {
  if (!v || typeof v !== "object") return false;
  const i = v as { code?: unknown; path?: unknown };
  return typeof i.code === "string" && ISSUE_CODES.has(i.code) && typeof i.path === "string";
}

/** The `warnings` of a source response (raw Arabic text kept as plain text). */
export function parseStoryWordWarnings(warnings: unknown): StoryWordIssue[] {
  return Array.isArray(warnings) ? warnings.filter(isStoryWordIssue) : [];
}

/** The issues of a `READER_WORDS_INVALID` refusal; null when the error is something else. */
export function parseStoryWordsError(
  error: { code?: string; details?: unknown } | null | undefined,
): StoryWordIssue[] | null {
  if (!error || error.code !== READER_WORDS_INVALID) return null;
  const details = error.details as { issues?: unknown } | undefined;
  return parseStoryWordWarnings(details?.issues);
}

/** One issue in plain words. */
export function plainStoryWordIssue(issue: StoryWordIssue, spellingOf?: (wordId: string) => string | undefined): string {
  switch (issue.code) {
    case "arabic_text":
      return `"${issue.text}" is not linked to a word bank word.`;
    case "malformed_token":
      return "A word reference is not written {{word:<id>}}.";
    case "unknown_word":
      return `The word ${issue.wordId} is not in the word bank.`;
    case "retired_word": {
      const spelling = spellingOf?.(issue.wordId);
      return `The word ${spelling ? `"${spelling}" ` : ""}(${issue.wordId}) is retired. Link another word.`;
    }
  }
}

/** Issues by location, in the order given. */
export function issuesByPath(issues: readonly StoryWordIssue[]): Map<string, StoryWordIssue[]> {
  const out = new Map<string, StoryWordIssue[]>();
  for (const issue of issues) out.set(issue.path, [...(out.get(issue.path) ?? []), issue]);
  return out;
}
