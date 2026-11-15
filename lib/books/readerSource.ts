/**
 * The book reader source as Studio's book editor edits it (content model
 * CM-S10, N11; backend BOOK_READER_CONTRACT.md "Shared source, translation
 * and narration workflow" and "Arabic words in storybooks").
 *
 * The source is the backend's `PublishReader` (`core/contracts/book-reader.ts`):
 * an English source edition plus an optional private assessment. Saving it
 * (`PUT /books/admin/:bookId/reader/source`) queues the translated and
 * narrated editions; the server removes any source narration and derives the
 * canonical word spans. The schema still checks the spans against the text, so
 * `prepareSource` writes them the way the schema reads them (one span per
 * whitespace-delimited token, UTF-16 offsets).
 *
 * v1's books (`book_pages`) are separate and untouched; `draftFromV1Pages`
 * only copies their text and art into a first draft.
 */

export type ReaderLayout = "image" | "text" | "above" | "below" | "full" | "panorama";

export const READER_LAYOUTS: ReadonlyArray<{ value: ReaderLayout; label: string }> = [
  { value: "text", label: "Text only" },
  { value: "image", label: "Picture only" },
  { value: "above", label: "Picture above text" },
  { value: "below", label: "Picture below text" },
  { value: "full", label: "Full-bleed picture" },
  { value: "panorama", label: "Panorama half" },
];

export interface ReaderIllustration {
  url: string;
  alt: string;
  aspect_ratio: number;
  fit?: "cover" | "contain";
  focal?: { x: number; y: number };
  compact_url?: string;
  half?: "left" | "right";
}

export interface ReaderWordSpan {
  id: string;
  start: number;
  end: number;
  wordRef?: { wordId: string };
}

export interface ReaderPage {
  id: string;
  spread_id?: string;
  layout: ReaderLayout;
  text: string;
  words: ReaderWordSpan[];
  illustration?: ReaderIllustration;
  narration?: unknown;
}

export interface ReaderAssessmentChoice {
  id: string;
  text: string;
  illustration_url?: string;
}

export interface ReaderAssessmentQuestion {
  id: string;
  prompt: string;
  choices: ReaderAssessmentChoice[];
  correct_choice_id: string;
}

/** The backend's limits on a private assessment (`ReaderQuestionSchema`, `ReaderAssessmentSchema`). */
export const QUESTION_LIMITS = { questions: 20, choices: { min: 2, max: 6 }, prompt: 1000, choice: 500 } as const;

export interface ReaderSourceContent {
  edition: {
    schema_version: 1;
    locale: string;
    revision: string;
    title: string;
    reading_direction: "ltr" | "rtl";
    pages: ReaderPage[];
    assessment?: { id: string; question_count: number };
  };
  assessment?: { id: string; questions: ReaderAssessmentQuestion[] };
}

/** `GET /books/admin/:bookId/reader/source`. */
export interface ReaderSourceView {
  source: { source_hash: string; content: ReaderSourceContent } | null;
  /** true: an unlinked Arabic word is refused on save (`BOOK_WORDS_REQUIRE_REFERENCES`). */
  require_word_references: boolean;
}

/** `PUT /books/admin/:bookId/reader/source`: queued, not yet published. */
export interface ReaderSourceSaved {
  source_hash: string;
  locales: string[];
  queued: number;
  warnings: unknown[];
}

const LAYOUTS = new Set<string>(READER_LAYOUTS.map((l) => l.value));

/** One span per whitespace-delimited token of `text`, as the backend schema reads them (`/\S+/gu`; the same UTF-16 matches without `u`). */
export function wordSpans(pageId: string, text: string): ReaderWordSpan[] {
  return Array.from(text.matchAll(/\S+/g), (m, i) => ({
    id: `${pageId}-w${i + 1}`,
    start: m.index!,
    end: m.index! + m[0].length,
  }));
}

/** A page id not used by `pages`. */
export function newPageId(pages: ReadonlyArray<Pick<ReaderPage, "id">>): string {
  const used = new Set(pages.map((p) => p.id));
  let n = pages.length + 1;
  while (used.has(`p${n}`)) n += 1;
  return `p${n}`;
}

/** A fresh source revision. The source hash covers it, so each save of changed content gets one. */
export function newRevision(now: Date = new Date()): string {
  return `s-${now.getTime().toString(36)}`;
}

/** A question id not used by `questions`. */
export function newQuestionId(questions: ReadonlyArray<Pick<ReaderAssessmentQuestion, "id">>): string {
  const used = new Set(questions.map((q) => q.id));
  let n = questions.length + 1;
  while (used.has(`q${n}`)) n += 1;
  return `q${n}`;
}

/** A choice id not used by `choices`. */
export function newChoiceId(choices: ReadonlyArray<Pick<ReaderAssessmentChoice, "id">>): string {
  const used = new Set(choices.map((c) => c.id));
  let n = choices.length + 1;
  while (used.has(`c${n}`)) n += 1;
  return `c${n}`;
}

/** A new question with two empty choices, the first correct. */
export function blankQuestion(id: string): ReaderAssessmentQuestion {
  return {
    id,
    prompt: "",
    choices: [
      { id: "c1", text: "" },
      { id: "c2", text: "" },
    ],
    correct_choice_id: "c1",
  };
}

/** Removes a choice; when it was the correct one the first remaining choice becomes correct. */
export function removeChoice(q: ReaderAssessmentQuestion, choiceId: string): ReaderAssessmentQuestion {
  const choices = q.choices.filter((c) => c.id !== choiceId);
  return {
    ...q,
    choices,
    correct_choice_id: choices.some((c) => c.id === q.correct_choice_id) ? q.correct_choice_id : (choices[0]?.id ?? ""),
  };
}

/**
 * The source with its questions replaced. The edition's public reference
 * (`{id, question_count}`) must match the private definition, so it is kept in
 * step here; no questions means no assessment at all.
 */
export function withQuestions(
  source: ReaderSourceContent,
  questions: ReaderAssessmentQuestion[],
): ReaderSourceContent {
  const edition = { ...source.edition };
  delete edition.assessment;
  const { assessment: current, ...rest } = source;
  if (!questions.length) return { ...rest, edition };
  const id = current?.id ?? "assessment";
  return {
    ...rest,
    edition: { ...edition, assessment: { id, question_count: questions.length } },
    assessment: { id, questions },
  };
}

export function blankPage(id: string): ReaderPage {
  return { id, layout: "text", text: "", words: [] };
}

export function blankSource(title: string): ReaderSourceContent {
  return {
    edition: {
      schema_version: 1,
      locale: "en",
      revision: newRevision(),
      title,
      reading_direction: "ltr",
      pages: [blankPage("p1")],
    },
  };
}

/** A v1 page as the draft reads it. */
export interface V1Page {
  page_number: number;
  background_image_url: string | null;
  text: string | null;
}

/** The default picture shape for art copied from v1, which stores none. */
export const V1_ASPECT_RATIO = 4 / 3;

/** A first draft from a v1 book's pages (text and art only). v1 itself is not changed. */
export function draftFromV1Pages(title: string, pages: readonly V1Page[]): ReaderSourceContent {
  const sorted = [...pages].sort((a, b) => a.page_number - b.page_number);
  const draft: ReaderPage[] = sorted.map((p, i) => {
    const id = `p${i + 1}`;
    const text = (p.text ?? "").trim();
    const url = (p.background_image_url ?? "").trim();
    const illustration = url
      ? { url, alt: "", aspect_ratio: V1_ASPECT_RATIO, fit: "cover" as const }
      : undefined;
    const layout: ReaderLayout = !illustration ? "text" : text ? "below" : "image";
    return { id, layout, text: layout === "image" ? "" : text, words: [], ...(illustration ? { illustration } : {}) };
  });
  const source = blankSource(title);
  return { ...source, edition: { ...source.edition, pages: draft.length ? draft : source.edition.pages } };
}

/**
 * The source as it is sent: spans written from each page's text, source
 * narration left out (the server generates it), and `revision`.
 */
export function prepareSource(source: ReaderSourceContent, revision: string): ReaderSourceContent {
  const synced = withQuestions(source, source.assessment?.questions ?? []);
  return {
    ...synced,
    edition: {
      ...synced.edition,
      revision,
      pages: source.edition.pages.map(({ narration: _narration, ...page }) => ({
        ...page,
        words: wordSpans(page.id, page.text),
      })),
    },
  };
}

/** True when the two sources differ in anything but their revision and derived fields. */
export function sourceChanged(a: ReaderSourceContent, b: ReaderSourceContent): boolean {
  const key = (s: ReaderSourceContent) => JSON.stringify(prepareSource(s, ""));
  return key(a) !== key(b);
}

/** A problem the server's schema would refuse, found before saving. */
export interface PageProblem {
  path: string;
  message: string;
}

/**
 * The page rules of the backend schema that an author can break in the
 * editor, in plain words. The server stays the judge; this only explains.
 */
export function pageProblems(source: ReaderSourceContent): PageProblem[] {
  const out: PageProblem[] = [];
  if (!source.edition.title.trim()) out.push({ path: "edition.title", message: "The book needs a title." });
  if (!source.edition.pages.length) out.push({ path: "edition.pages", message: "The book needs a page." });
  source.edition.pages.forEach((page, i) => {
    const path = `edition.pages[${i}]`;
    const add = (message: string) => out.push({ path, message });
    if (!LAYOUTS.has(page.layout)) add("Choose a layout.");
    if (page.layout !== "text" && !page.illustration?.url) add("This layout needs a picture.");
    if (page.illustration?.url && !page.illustration.url.startsWith("https://")) {
      add("The picture address must start with https://.");
    }
    if (page.illustration && !(page.illustration.aspect_ratio > 0 && page.illustration.aspect_ratio <= 20)) {
      add("The picture shape (width / height) must be above 0 and at most 20.");
    }
    if (page.layout === "image" && page.text !== "") add("A picture-only page has no text.");
    if (page.layout !== "image" && !page.text.trim()) add("This page needs text.");
    if (page.layout === "panorama" && (!page.spread_id || !page.illustration?.half)) {
      add("A panorama page needs its spread and half (set by the saved source).");
    }
  });
  return out;
}

/** The assessment rules of the backend schema that an author can break in the editor, in plain words. */
export function questionProblems(source: ReaderSourceContent): PageProblem[] {
  const out: PageProblem[] = [];
  const questions = source.assessment?.questions ?? [];
  if (questions.length > QUESTION_LIMITS.questions) {
    out.push({ path: "assessment", message: `A book has at most ${QUESTION_LIMITS.questions} questions.` });
  }
  questions.forEach((q, i) => {
    const path = `assessment.questions[${i}]`;
    const add = (message: string) => out.push({ path, message });
    if (!q.prompt.trim()) add("The question needs text.");
    else if (q.prompt.length > QUESTION_LIMITS.prompt) add(`The question is at most ${QUESTION_LIMITS.prompt} characters.`);
    if (q.choices.length < QUESTION_LIMITS.choices.min) add(`A question needs at least ${QUESTION_LIMITS.choices.min} answers.`);
    if (q.choices.length > QUESTION_LIMITS.choices.max) add(`A question has at most ${QUESTION_LIMITS.choices.max} answers.`);
    if (q.choices.some((c) => !c.text.trim())) add("Every answer needs text.");
    if (q.choices.some((c) => c.text.length > QUESTION_LIMITS.choice)) {
      add(`An answer is at most ${QUESTION_LIMITS.choice} characters.`);
    }
    if (q.choices.some((c) => c.illustration_url && !c.illustration_url.startsWith("https://"))) {
      add("An answer picture address must start with https://.");
    }
    if (!q.choices.some((c) => c.id === q.correct_choice_id)) add("Mark one answer as correct.");
  });
  return out;
}

export function pageLabel(path: string): string {
  const q = path.match(/^assessment\.questions\[(\d+)\]/);
  if (q) return `Question ${Number(q[1]) + 1}`;
  const m = path.match(/^edition\.pages\[(\d+)\]/);
  return m ? `Page ${Number(m[1]) + 1}` : path === "edition.title" ? "Title" : "Book";
}
