/**
 * `sound_sort` in Studio (CM-S12; backend CM-B35, ADR 0002): the child hears
 * each word, picture or clip and drags it into the basket of its sound.
 *
 * - `first_sound`: 2 or 3 baskets; an item goes to the basket of the sound it
 *   starts with.
 * - `contrast`: exactly 2 baskets for two sounds English does not tell apart;
 *   a basket shows no letter or word (a `listen:` task is heard, not read).
 *
 * The form keeps baskets and items as editor items; the save writes
 * references only. Pure.
 */

import { emptied, isFilled, toContentRefWrite, type EditorItem } from "../activityConfig/contentItems";
import { letterUnits } from "../words/review/arabicText";
import { editorItems, isRecord, nextId, referenceKey, sharedOptional, unreferencedProblem, type Config } from "./common";

export type SortBy = "first_sound" | "contrast";

/** The schema's bounds (`sound_sort.ts`; the package exports only the enums). */
export const SOUND_SORT_MIN_BINS = 2;
export const SOUND_SORT_MAX_BINS = 3;
export const SOUND_SORT_MIN_ITEMS = 4;
export const SOUND_SORT_MAX_ITEMS = 8;
export const CONTRAST_BINS = 2;

export interface SortBin {
  id: string;
  /** The sound the basket stands for (`letters.id`); '' until picked. */
  letterId: string;
  /** What the basket shows. */
  label: EditorItem;
}

export type SortItem = EditorItem & { id: string; binId: string };

export function sortByOf(config: Config | undefined): SortBy {
  return config?.sortBy === "contrast" ? "contrast" : "first_sound";
}

/** The kinds a basket may show for this sort. */
export function binLabelKinds(sortBy: SortBy): EditorItem["kind"][] {
  return sortBy === "contrast" ? ["audio", "image"] : ["letter", "image", "audio"];
}

export const ITEM_KINDS: EditorItem["kind"][] = ["word", "image", "audio"];

function emptyLabel(sortBy: SortBy): EditorItem {
  return { kind: sortBy === "contrast" ? "audio" : "letter" };
}

/** The stored baskets, else two empty ones. */
export function binsOf(config: Config | undefined): SortBin[] {
  const sortBy = sortByOf(config);
  const stored = Array.isArray(config?.bins) ? config!.bins.filter(isRecord) : [];
  if (stored.length === 0) {
    return [
      { id: "b1", letterId: "", label: emptyLabel(sortBy) },
      { id: "b2", letterId: "", label: emptyLabel(sortBy) },
    ];
  }
  return stored.map((b, n) => ({
    id: typeof b.id === "string" && b.id ? b.id : `b${n + 1}`,
    letterId: typeof b.letterId === "string" ? b.letterId : "",
    label: isRecord(b.label) ? editorItems([b.label])[0]! : emptyLabel(sortBy),
  }));
}

/** The stored items, else four empty words in the first basket. */
export function itemsOf(config: Config | undefined, bins: readonly SortBin[]): SortItem[] {
  const stored = Array.isArray(config?.items) ? config!.items.filter(isRecord) : [];
  if (stored.length === 0) {
    const out: SortItem[] = [];
    for (let i = 0; i < SOUND_SORT_MIN_ITEMS; i += 1) {
      out.push({ id: nextId("i", out.map((o) => o.id)), kind: "word", binId: bins[i % bins.length]?.id ?? "" });
    }
    return out;
  }
  return stored.map((raw, n) => {
    const item = editorItems([raw])[0]!;
    return { ...item, id: item.id ?? `i${n + 1}`, binId: typeof raw.binId === "string" ? raw.binId : "" };
  });
}

export function addBin(bins: readonly SortBin[], sortBy: SortBy): SortBin[] {
  return [...bins, { id: nextId("b", bins.map((b) => b.id)), letterId: "", label: emptyLabel(sortBy) }];
}

export function addItem(items: readonly SortItem[], bins: readonly SortBin[]): SortItem[] {
  return [...items, { id: nextId("i", items.map((i) => i.id)), kind: "word", binId: bins[0]?.id ?? "" }];
}

/** Removing a basket moves its items to the first other basket. */
export function removeBin(bins: readonly SortBin[], items: readonly SortItem[], index: number) {
  const gone = bins[index];
  const nextBins = bins.filter((_, i) => i !== index);
  const fallback = nextBins[0]?.id ?? "";
  return {
    bins: nextBins,
    items: items.map((it) => (gone && it.binId === gone.id ? { ...it, binId: fallback } : it)),
  };
}

/**
 * The basket's sound set to `letterId`. In a first-sound sort a basket with no
 * label, or a letter label, shows that letter.
 */
export function withBinLetter(bin: SortBin, letterId: string, sortBy: SortBy): SortBin {
  const next = { ...bin, letterId };
  if (sortBy === "first_sound" && letterId && (bin.label.kind === "letter" || !isFilled(bin.label))) {
    next.label = { kind: "letter", letter: { letterId, form: "isolated" } };
  }
  return next;
}

/** Switching to a contrast clears any letter or word on a basket (it must show none). */
export function withSortBy(bins: readonly SortBin[], sortBy: SortBy): SortBin[] {
  if (sortBy !== "contrast") return [...bins];
  return bins.map((b) =>
    b.label.kind === "letter" || b.label.kind === "word" ? { ...b, label: emptied({ ...b.label, kind: "audio" }) } : b
  );
}

/** The letter ids of an Arabic text, in order; null when a letter is not known. */
export function letterIdsOf(text: string, letterIdByChar: (ch: string) => string | undefined): string[] | null {
  const out: string[] = [];
  for (const unit of letterUnits(text)) {
    const id = letterIdByChar(unit.base);
    if (!id) return null;
    out.push(id);
  }
  return out;
}

export interface SoundSortContext {
  /** A library word's letter ids, or null when its text or a letter is not known. */
  wordLetters?: (wordId: string) => string[] | null;
  /** A letter id's display name, for the messages. */
  letterName?: (letterId: string) => string;
}

/**
 * What stops the sort from saving, in plain language: the write schema, the
 * server's `distractors_differ` (one word or clip in two baskets) and
 * `sort_item_sound` (a word item has its basket's sound).
 */
export function soundSortProblems(
  sortBy: SortBy,
  bins: readonly SortBin[],
  items: readonly SortItem[],
  ctx: SoundSortContext = {},
): string[] {
  const out: string[] = [];
  const name = (id: string) => ctx.letterName?.(id) ?? id;
  if (sortBy === "contrast" && bins.length !== CONTRAST_BINS) {
    out.push(`A listening contrast sorts into exactly ${CONTRAST_BINS} baskets (there are ${bins.length}).`);
  } else if (bins.length < SOUND_SORT_MIN_BINS || bins.length > SOUND_SORT_MAX_BINS) {
    out.push(`Use ${SOUND_SORT_MIN_BINS} to ${SOUND_SORT_MAX_BINS} baskets (there are ${bins.length}).`);
  }
  const sounds = new Map<string, number>();
  bins.forEach((b, n) => {
    const label = `Basket ${n + 1}`;
    if (!b.letterId) out.push(`${label} has no sound yet.`);
    else if (sounds.has(b.letterId)) out.push(`Baskets ${sounds.get(b.letterId)! + 1} and ${n + 1} stand for the same sound.`);
    else sounds.set(b.letterId, n);
    if (!isFilled(b.label)) out.push(`${label} shows nothing yet.`);
    if (sortBy === "contrast" && (b.label.kind === "letter" || b.label.kind === "word")) {
      out.push(`${label}: a listening contrast shows no letter or word on a basket.`);
    }
    const unref = unreferencedProblem(b.label);
    if (unref) out.push(`${label}: ${unref}.`);
  });

  if (items.length < SOUND_SORT_MIN_ITEMS || items.length > SOUND_SORT_MAX_ITEMS) {
    out.push(`Give ${SOUND_SORT_MIN_ITEMS} to ${SOUND_SORT_MAX_ITEMS} items (there are ${items.length}).`);
  }
  const binIndex = new Map(bins.map((b, n) => [b.id, n]));
  const filled = new Set<string>();
  const binOfRef = new Map<string, { bin: string; n: number }>();
  items.forEach((it, n) => {
    const label = `Item ${n + 1}${it.kind === "word" && it.word?.text ? ` (${it.word.text})` : ""}`;
    if (!isFilled(it)) out.push(`${label} is empty.`);
    const unref = unreferencedProblem(it);
    if (unref) out.push(`${label}: ${unref}.`);
    if (!binIndex.has(it.binId)) out.push(`${label} is in no basket.`);
    else filled.add(it.binId);
    const key = referenceKey(it);
    if (key) {
      const was = binOfRef.get(key);
      if (was && was.bin !== it.binId) out.push(`Items ${was.n + 1} and ${n + 1} are the same ${it.kind} in two baskets.`);
      else if (!was) binOfRef.set(key, { bin: it.binId, n });
    }
    out.push(...itemSoundProblems(sortBy, bins, it, label, ctx, name));
  });
  bins.forEach((b, n) => {
    if (binIndex.has(b.id) && !filled.has(b.id)) out.push(`Basket ${n + 1} has no item.`);
  });
  return out;
}

/** `sort_item_sound`: a word item starts with (first sound) or has only (contrast) its basket's sound. */
function itemSoundProblems(
  sortBy: SortBy,
  bins: readonly SortBin[],
  it: SortItem,
  label: string,
  ctx: SoundSortContext,
  name: (id: string) => string,
): string[] {
  if (it.kind !== "word" || !it.word?.wordId || !ctx.wordLetters) return [];
  const sound = bins.find((b) => b.id === it.binId)?.letterId;
  const letters = ctx.wordLetters(it.word.wordId);
  if (!sound || !letters || letters.length === 0) return [];
  if (sortBy === "first_sound") {
    return letters[0] === sound ? [] : [`${label} does not start with the sound of its basket (${name(sound)}).`];
  }
  const other = bins.map((b) => b.letterId).find((s) => s && s !== sound);
  if (!letters.includes(sound)) return [`${label} does not have the sound of its basket (${name(sound)}).`];
  if (other && letters.includes(other)) {
    return [`${label} has both sounds (${name(sound)} and ${name(other)}); a child cannot sort it.`];
  }
  return [];
}

/** The config as the write schema takes it: baskets and items by reference. */
export function writeSoundSort(config: Config): Config {
  const bins = binsOf(config);
  const out: Config = {
    sortBy: sortByOf(config),
    bins: bins.map((b) => ({ id: b.id, letterId: b.letterId, label: toContentRefWrite(b.label) })),
    items: itemsOf(config, bins).map((it) => ({ id: it.id, ...toContentRefWrite(it), binId: it.binId })),
  };
  return sharedOptional(config, out, ["playItemAudio", "conditionalAudio"]);
}

/** The baskets and items as the form keeps them in the config. */
export function soundSortConfig(config: Config, bins: readonly SortBin[], items: readonly SortItem[]): Config {
  return { ...config, bins: bins.map((b) => ({ ...b })), items: items.map((i) => ({ ...i })) };
}
