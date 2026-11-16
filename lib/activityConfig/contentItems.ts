/**
 * Content items in Studio's answer-set forms (content model CM-S6; design 3.1,
 * D17; CONTENT_ITEM_DESIGN.md).
 *
 * The shared `ContentItemEditor` and `ContentItemGrid` edit an `EditorItem`:
 * a content item (`kind` and one reference payload: a letter reference, a
 * library word by id, an asset by id, a numeral) with the display hints the
 * editor needs to draw it (the word's text, the asset's URL). The hints never
 * reach a canonical save (`toContentItemWrite`, `toContentRefWrite`).
 *
 * The three containers (MCQ options, cards, match pair sides) hold v1's
 * shape in the form, with the item's reference beside it (a word keeps
 * `word: { wordId }`), so one form state saves either way. Each container has
 * a pair of pure adapters: stored entry -> `EditorItem` (to draw it) and
 * `EditorItem` -> v1 entry (what the form stores when an author edits it).
 * A row v1 can show from references alone (the server writes option `text`,
 * `mode`, `question`, card `text` and pair `type` / `value` / `audioUrl` from
 * them, R2) is cut to the write schema by `canonical.ts`; any other row is
 * saved in v1's shape as before.
 */

import { readContentText, readLetterRef } from "@kalam/curriculum-schemas/server";

export type Config = Record<string, unknown>;

/** What a content item is (design 3.1; `numeral` is D17). */
export type EditorKind = "letter" | "word" | "image" | "audio" | "numeral";

export const EDITOR_KINDS: readonly EditorKind[] = ["letter", "word", "image", "audio", "numeral"];

export interface EditorLetter {
  letterId: string;
  form: "isolated" | "initial" | "medial" | "final";
  haraka?: string;
  madd?: true;
}

/** A content item as the editor holds it: a reference plus display hints. */
export interface EditorItem {
  /** The authored option or card id (answer sets only). */
  id?: string;
  kind: EditorKind;
  letter?: EditorLetter;
  /** `wordId` is the reference (`curriculum_words.id`); `text` is a display hint. */
  word?: { wordId?: string; text?: string };
  /** `assetId` is the reference (the `assets` registry id); `url` is a display hint. */
  image?: { assetId?: string; url?: string };
  /** `assetId` is the reference (an `audio_assets` id); `url` is a display hint. */
  audio?: { assetId?: string; url?: string };
  numeral?: number;
  isCorrect?: boolean;
  label?: string;
}

const isRecord = (v: unknown): v is Config => typeof v === "object" && v !== null && !Array.isArray(v);

const filled = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** The same item as another kind: the other payloads are cleared; id, correctness and label stay. */
export function withKind(item: EditorItem, kind: EditorKind): EditorItem {
  return item.kind === kind ? item : emptied({ ...item, kind });
}

/** The item with its payload cleared; kind, id, correctness and label stay. */
export function emptied(item: EditorItem): EditorItem {
  const next: EditorItem = { kind: item.kind };
  if (item.id !== undefined) next.id = item.id;
  if (item.isCorrect !== undefined) next.isCorrect = item.isCorrect;
  if (item.label !== undefined) next.label = item.label;
  return next;
}

/** True when the item's payload is set (a picked letter, word, asset or number). */
export function isFilled(item: EditorItem): boolean {
  switch (item.kind) {
    case "letter":
      return !!item.letter?.letterId;
    case "word":
      return !!(item.word?.wordId || filled(item.word?.text));
    case "image":
      return !!(item.image?.assetId || filled(item.image?.url));
    case "audio":
      return !!(item.audio?.assetId || filled(item.audio?.url));
    case "numeral":
      return typeof item.numeral === "number" && Number.isFinite(item.numeral);
  }
}

/** The kind an answer grid shows: the one kind of its filled items, else `fallback`. */
export function gridKindOf(items: readonly EditorItem[], fallback: EditorKind): EditorKind {
  const kinds = new Set(items.filter(isFilled).map((i) => i.kind));
  return kinds.size === 1 ? Array.from(kinds)[0]! : fallback;
}

/** A letter value as a clean reference (the server's `readLetterRef`), or undefined. */
function letterRef(value: unknown): EditorLetter | undefined {
  const r = readLetterRef(value);
  return isRecord(r) && typeof r.letterId === "string" ? (r as unknown as EditorLetter) : undefined;
}

/** A stored item that already has `kind` (canonical, or read by the server). */
export function kindedItem(entry: Config): EditorItem {
  const item: EditorItem = { kind: entry.kind as EditorKind };
  if (typeof entry.id === "string") item.id = entry.id;
  if (typeof entry.isCorrect === "boolean") item.isCorrect = entry.isCorrect;
  if (typeof entry.label === "string" && entry.label) item.label = entry.label;
  const letter = letterRef(entry.letter);
  if (letter) item.letter = letter;
  if (isRecord(entry.word)) item.word = { ...entry.word } as EditorItem["word"];
  if (isRecord(entry.image)) item.image = { ...entry.image } as EditorItem["image"];
  if (isRecord(entry.audio)) item.audio = { ...entry.audio } as EditorItem["audio"];
  if (typeof entry.numeral === "number") item.numeral = entry.numeral;
  return item;
}

/**
 * Authored Arabic text as an item, as the server reads it (`readContentText`):
 * digits a numeral (D17), one glyph a letter, other text a word (text hint).
 */
function textItem(text: string): EditorItem | null {
  const read = readContentText(text);
  return read ? kindedItem(read) : null;
}

/** A v1-shape entry's word reference, kept beside its text (`word: { wordId }`). */
function storedWordId(entry: Config): string | undefined {
  return isRecord(entry.word) && typeof entry.word.wordId === "string" && entry.word.wordId
    ? entry.word.wordId
    : undefined;
}

/** A text read as an item, with the entry's stored word id when the text is a word. */
function textItemOf(text: string, entry: Config): EditorItem | null {
  const read = textItem(text);
  const wordId = storedWordId(entry);
  if (read?.kind === "word" && wordId) return { ...read, word: { ...read.word, wordId } };
  return read;
}

/** The word reference a v1-shape entry keeps beside its text. */
function wordRefOf(item: EditorItem): Config {
  return item.word?.wordId ? { word: { wordId: item.word.wordId } } : {};
}

/** The content keys of a stored entry, old and new; an edit rewrites all of them. */
const CONTENT_KEYS = [
  "kind", "letter", "word", "image", "imageUrl", "audio", "numeral", "text", "value", "type",
  "letterId", "form", "haraka", "audioUrl", "audioId", "letterDisplay",
];

/** A stored entry's other keys, kept on edit. */
function rest(previous: unknown): Config {
  if (!isRecord(previous)) return {};
  const out = { ...previous };
  for (const k of CONTENT_KEYS) delete out[k];
  return out;
}

// ---------------------------------------------------------------------------
// canonical writes: references only
// ---------------------------------------------------------------------------

/** The payload of an item as the write schema takes it (no hints). */
function writePayload(item: EditorItem): Config {
  const out: Config = { kind: item.kind };
  switch (item.kind) {
    case "letter": {
      const r = letterRef(item.letter);
      if (r) out.letter = r;
      break;
    }
    case "word":
      if (item.word?.wordId) out.word = { wordId: item.word.wordId };
      break;
    case "image":
      if (item.image?.assetId) out.image = { assetId: item.image.assetId };
      break;
    case "audio":
      if (item.audio?.assetId) out.audio = { assetId: item.audio.assetId };
      break;
    case "numeral":
      if (typeof item.numeral === "number") out.numeral = item.numeral;
      break;
  }
  if (item.label) out.label = item.label;
  return out;
}

/** An answer-set item (MCQ option, card) as `ContentItemWriteSchema` takes it. */
export function toContentItemWrite(item: EditorItem): Config {
  const out: Config = { id: item.id, ...writePayload(item) };
  if (typeof item.isCorrect === "boolean") out.isCorrect = item.isCorrect;
  return out;
}

/** A match pair side or prompt target as `ContentRefWriteSchema` takes it. */
export function toContentRefWrite(item: EditorItem): Config {
  return writePayload(item);
}

// ---------------------------------------------------------------------------
// prompt (design 3.1, CM-B12)
// ---------------------------------------------------------------------------

export const PROMPT_KIND_OPTIONS = [
  { value: "sound_to_symbol", label: "Sound to symbol", hint: "Hear a sound, pick what is written" },
  { value: "symbol_to_sound", label: "Symbol to sound", hint: "See what is written, pick its sound" },
  { value: "word_to_picture", label: "Word to picture", hint: "A word, pick its picture" },
  { value: "picture_to_word", label: "Picture to word", hint: "A picture, pick its word" },
  { value: "meaning", label: "Meaning", hint: "What a word means" },
  { value: "form", label: "Letter form", hint: "Which form of the letter" },
  { value: "haraka", label: "Haraka", hint: "Which short vowel" },
  { value: "count", label: "Count", hint: "How many (numeral answers)" },
  { value: "letter_in_word", label: "Letter in word", hint: "Pick the word that has the letter" },
] as const;

export type PromptKind = typeof PROMPT_KIND_OPTIONS[number]["value"];

export function isPromptKind(v: unknown): v is PromptKind {
  return PROMPT_KIND_OPTIONS.some((o) => o.value === v);
}

/** The prompt kind of a config, if one is set. */
export function promptKind(config: { prompt?: unknown } | undefined): PromptKind | undefined {
  const prompt = config?.prompt;
  const kind = isRecord(prompt) ? prompt.kind : undefined;
  return isPromptKind(kind) ? kind : undefined;
}

/** The config with its prompt kind set (keeping a stored target) or the prompt removed. */
export function withPromptKind<T extends { prompt?: unknown }>(config: T, kind: PromptKind | undefined): T {
  const next: T = { ...config };
  const target = isRecord(config.prompt) ? config.prompt.target : undefined;
  if (kind) next.prompt = target !== undefined ? { kind, target } : { kind };
  else if (target !== undefined) next.prompt = { target };
  else delete next.prompt;
  return next;
}

/** A prompt as the write schema takes it: the kind and a reference-only target. */
export function writePrompt(prompt: unknown): unknown {
  if (!isRecord(prompt)) return prompt;
  const out: Config = { kind: prompt.kind };
  if (isRecord(prompt.target) && typeof prompt.target.kind === "string") {
    out.target = toContentRefWrite(kindedItem(prompt.target));
  }
  return out;
}

// ---------------------------------------------------------------------------
// multiple_choice_question options (v1: text.ar, image, mode)
// ---------------------------------------------------------------------------

export type McqMode = "letter" | "word" | "image" | "text";

/** The v1 `mode` an answer grid of one kind stores (v1 renders `image` apart; every other mode as text). */
export const MCQ_MODE_OF_KIND: Readonly<Record<EditorKind, McqMode>> = {
  letter: "letter",
  word: "word",
  numeral: "text",
  image: "image",
  audio: "text",
};

/** One stored option as an item, in v1's rendering order (`mode: image` shows the picture). */
export function mcqOptionItem(option: unknown, mode: unknown): EditorItem {
  if (!isRecord(option)) return { kind: "letter" };
  if (typeof option.kind === "string") return kindedItem(option);
  const base: EditorItem = { kind: "letter" };
  if (typeof option.id === "string") base.id = option.id;
  if (typeof option.isCorrect === "boolean") base.isCorrect = option.isCorrect;
  const image = filled(option.image) ?? filled(option.imageUrl);
  if (mode === "image" && image) return { ...base, kind: "image", image: { url: image } };
  const letter = letterRef(option.letter);
  const text = isRecord(option.text) ? filled(option.text.ar) : filled(option.text);
  if (letter && !text) return { ...base, kind: "letter", letter };
  if (text) {
    const read = textItemOf(text, option);
    if (read) return { ...read, ...base, kind: read.kind };
  }
  if (letter) return { ...base, kind: "letter", letter };
  if (image) return { ...base, kind: "image", image: { url: image } };
  return { ...base, kind: kindOfMcqMode(mode) };
}

/** The grid kind an empty option takes from the stored v1 `mode`. */
export function kindOfMcqMode(mode: unknown): EditorKind {
  if (mode === "image") return "image";
  if (mode === "word" || mode === "text") return "word";
  return "letter";
}

/**
 * An edited option in v1's shape (what the MCQ form stored before CM-S6):
 * a letter keeps its reference with empty text (the delivery writes the
 * glyph); a word, a numeral its Arabic text; a picture its URL.
 */
export function mcqOptionFromItem(item: EditorItem, previous?: unknown): Config {
  const out: Config = { ...rest(previous), id: item.id, isCorrect: item.isCorrect ?? false };
  switch (item.kind) {
    case "letter":
      out.text = { en: "", ar: "" };
      if (item.letter) out.letter = letterRef(item.letter);
      break;
    case "word":
      out.text = { en: "", ar: item.word?.text ?? "" };
      Object.assign(out, wordRefOf(item));
      break;
    case "numeral":
      out.text = { en: "", ar: typeof item.numeral === "number" ? String(item.numeral) : "" };
      break;
    case "image":
      out.text = { en: "", ar: "" };
      if (item.image?.url) out.image = item.image.url;
      break;
    case "audio":
      out.text = { en: "", ar: "" };
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// content_with_cards cards (v1: text, image)
// ---------------------------------------------------------------------------

/** The v1 `cardMode` a card grid of one kind stores (v1 itself reads only the card text or image). */
export const CARD_MODE_OF_KIND: Readonly<Record<EditorKind, "letter" | "word" | "image">> = {
  letter: "letter",
  word: "word",
  numeral: "word",
  image: "image",
  audio: "word",
};

export function kindOfCardMode(mode: unknown): EditorKind {
  if (mode === "image") return "image";
  if (mode === "word") return "word";
  return "letter";
}

/** One stored card as an item: its letter reference, else its text, else its picture. */
export function cardItem(card: unknown, cardMode: unknown): EditorItem {
  if (!isRecord(card)) return { kind: "letter" };
  if (typeof card.kind === "string") return kindedItem(card);
  const base: EditorItem = { kind: "letter" };
  if (typeof card.id === "string") base.id = card.id;
  if (typeof card.isCorrect === "boolean") base.isCorrect = card.isCorrect;
  const letter = letterRef(card.letter);
  if (letter) return { ...base, kind: "letter", letter };
  const text = filled(card.text);
  if (text) {
    const read = textItemOf(text, card);
    if (read) return { ...read, ...base, kind: read.kind };
  }
  const image = filled(card.image) ?? filled(card.imageUrl);
  if (image) return { ...base, kind: "image", image: { url: image } };
  return { ...base, kind: kindOfCardMode(cardMode) };
}

/** An edited card in v1's shape (what the cards form stored before CM-S6). */
export function cardFromItem(item: EditorItem, previous?: unknown): Config {
  const out: Config = { ...rest(previous), id: item.id, text: "", isCorrect: item.isCorrect ?? false };
  switch (item.kind) {
    case "letter":
      if (item.letter) out.letter = letterRef(item.letter);
      break;
    case "word":
      out.text = item.word?.text ?? "";
      Object.assign(out, wordRefOf(item));
      break;
    case "numeral":
      out.text = typeof item.numeral === "number" ? String(item.numeral) : "";
      break;
    case "image":
      if (item.image?.url) out.image = item.image.url;
      break;
    case "audio":
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// match_pairs sides (v1: type, value, audioUrl, label)
// ---------------------------------------------------------------------------

/** One stored pair side as an item. */
export function pairSideItem(side: unknown): EditorItem {
  if (!isRecord(side)) return { kind: "letter" };
  if (typeof side.kind === "string") return kindedItem(side);
  const item: EditorItem = { kind: "letter" };
  if (typeof side.label === "string" && side.label) item.label = side.label;
  const value = filled(side.value);
  switch (side.type) {
    case "word": {
      const read = value ? textItem(value) : null;
      // v1 shows a word side's value as text: a digit stays a numeral, everything else a word
      if (read?.kind === "numeral") return { ...item, kind: "numeral", numeral: read.numeral };
      const wordId = storedWordId(side);
      if (!value) return { ...item, kind: "word" };
      return { ...item, kind: "word", word: wordId ? { wordId, text: value } : { text: value } };
    }
    case "image":
      return value ? { ...item, kind: "image", image: { url: value } } : { ...item, kind: "image" };
    case "audio": {
      const url = filled(side.audioUrl) ?? value;
      const audio: EditorItem["audio"] = {};
      if (filled(side.audioId)) audio.assetId = side.audioId as string;
      if (url) audio.url = url;
      return Object.keys(audio).length ? { ...item, kind: "audio", audio } : { ...item, kind: "audio" };
    }
    default: {
      const letter = typeof side.letterId === "string" ? letterRef(side) : undefined;
      if (letter) return { ...item, kind: "letter", letter };
      const read = value ? textItem(value) : null;
      return read?.kind === "letter" ? { ...item, kind: "letter", letter: read.letter } : item;
    }
  }
}

/**
 * An edited pair side in v1's shape (what `MatchItemEditor` stored before
 * CM-S6): `type`, the display `value` (v1 renders it verbatim, so a letter's
 * glyph carries its haraka), the flat letter fields, the audio URL and id.
 * A numeral is a word side showing its digits.
 */
export function pairSideFromItem(item: EditorItem, glyphOf: (letter: EditorLetter) => string): Config {
  const label = item.label ? { label: item.label } : {};
  switch (item.kind) {
    case "letter": {
      if (!item.letter) return { type: "letter", value: "", ...label };
      const r = letterRef(item.letter)!;
      return {
        type: "letter",
        value: glyphOf(r),
        letterId: r.letterId,
        form: r.form,
        ...(r.haraka ? { haraka: r.haraka } : {}),
        ...label,
      };
    }
    case "word":
      return { type: "word", value: item.word?.text ?? "", ...wordRefOf(item), ...label };
    case "numeral":
      return { type: "word", value: typeof item.numeral === "number" ? String(item.numeral) : "", ...label };
    case "image":
      return { type: "image", value: item.image?.url ?? "", ...label };
    case "audio": {
      const url = item.audio?.url;
      return {
        type: "audio",
        value: url ?? "",
        ...(url ? { audioUrl: url } : {}),
        ...(item.audio?.assetId ? { audioId: item.audio.assetId } : {}),
        ...label,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// answer-set problems (a mirror of the backend's save blocks, CM-P1)
// ---------------------------------------------------------------------------

/**
 * What an item shows, as one comparable key; null for an empty item. Text
 * before the library id, as the server compares an option it reads in v1's
 * shape (backend `content-blocks.ts`, `optionDisplayKey`).
 */
export function itemDisplayKey(item: EditorItem): string | null {
  if (!isFilled(item)) return null;
  switch (item.kind) {
    case "letter": {
      const l = item.letter!;
      return `letter:${l.letterId}:${l.form ?? "isolated"}:${l.haraka ?? ""}:${l.madd ? "madd" : ""}`;
    }
    case "word": {
      const text = filled(item.word?.text);
      return text ? `text:${text.normalize("NFKC").trim()}` : `word:${item.word?.wordId}`;
    }
    case "numeral":
      return `numeral:${item.numeral}`;
    case "image":
    case "audio": {
      const ref = item[item.kind]!;
      return ref.assetId ? `${item.kind}:asset:${ref.assetId}` : `${item.kind}:${(ref.url ?? "").trim().split("?")[0]}`;
    }
  }
}

/**
 * What the server refuses to save in an answer set (backend CM-P1: no
 * correct option, every option correct, duplicate options), in plain words,
 * so the form says it before a save does. `options`: a multiple-choice
 * question's options; `cards`: interactive cards (only a correct card is
 * needed). Nothing is said about an answer set that is still empty.
 */
export function answerSetProblems(items: readonly EditorItem[], role: "options" | "cards"): string[] {
  if (!items.some(isFilled)) return [];
  const problems: string[] = [];
  const correct = items.filter((i) => i.isCorrect === true).length;
  if (correct === 0) {
    problems.push(
      role === "options"
        ? "No option is marked correct, so the child can never finish this question. Mark the right answer."
        : "No card is marked correct, so the child can never finish. Mark the right card, or make the cards a display.",
    );
  }
  if (role === "cards") return problems;
  if (items.length >= 2 && correct === items.length) {
    problems.push("Every option is marked correct, so any tap wins and nothing is tested. Leave at least one wrong option.");
  }
  const firstAt = new Map<string, number>();
  items.forEach((item, n) => {
    const key = itemDisplayKey(item);
    if (key === null) return;
    const first = firstAt.get(key);
    if (first === undefined) firstAt.set(key, n);
    else problems.push(`Option ${n + 1} shows the same thing as option ${first + 1}. Each option must be different.`);
  });
  return problems;
}
