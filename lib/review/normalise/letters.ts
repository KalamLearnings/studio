/**
 * Letter sounds (CW-11): every file of the audio library's `letter_sounds`
 * category as a listen item, grouped by letter, with its open review flag
 * (BE-3, `GET /assets/letter-sounds/review-flags`). Pure.
 *
 * A file has no letter field: its letter is the tag that is a letter id
 * (`ba`, `kasra` → ba), its vowel the tag that is a haraka id. A file with no
 * letter tag goes to a last group. A flagged file waits for a decision
 * (clear the flag, or change it); every other file is listen-only.
 */

import { HARAKA_IDS, HARAKA_META, type HarakaType } from "@kalam/curriculum-schemas";
import type { AudioAsset } from "../../types/audio";
import type { InboxItem } from "../inbox";

// ---- the flag (BE-3) -------------------------------------------------------------------

/** The backend's `LETTER_SOUND_FLAG_REASONS`; `other` needs a note. */
export const LETTER_FLAG_REASONS = ["wrong_letter", "wrong_vowel", "wrong_length", "unclear", "noise", "cut_off", "other"] as const;
export type LetterFlagReason = (typeof LETTER_FLAG_REASONS)[number];

export const LETTER_FLAG_LABELS: Record<LetterFlagReason, string> = {
  wrong_letter: "Wrong letter",
  wrong_vowel: "Wrong vowel",
  wrong_length: "Wrong length",
  unclear: "Unclear",
  noise: "Noise",
  cut_off: "Cut off",
  other: "Other (say why)",
};

/** The file a flag is on, as the flag list carries it (null when the catalogue row is gone). */
export interface FlaggedFile {
  id: string;
  name: string;
  display_name: string;
  storage_path: string;
  url: string;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
}

export interface LetterSoundFlag {
  asset_id: string;
  reason: LetterFlagReason;
  note: string | null;
  flagged_by: string;
  flagged_at: string;
  cleared_by: string | null;
  cleared_at: string | null;
  asset?: FlaggedFile | null;
}

export interface LetterFlagInput {
  reason: LetterFlagReason;
  note?: string;
}

/** The flag body, checked as the backend checks it: a reason, `other` needs a note, a note is at most 500 characters. */
export function letterFlagBody(reason: LetterFlagReason | "", note: string): { ok: true; body: LetterFlagInput } | { ok: false; error: string } {
  if (!reason) return { ok: false, error: "Pick a reason." };
  const n = note.trim();
  if (n.length > 500) return { ok: false, error: "The note may be at most 500 characters." };
  if (reason === "other" && !n) return { ok: false, error: "Say why in the note when the reason is Other." };
  return { ok: true, body: n ? { reason, note: n } : { reason } };
}

/** The flag in a line: "Wrong vowel: says bi". */
export function flagLine(flag: Pick<LetterSoundFlag, "reason" | "note">): string {
  const label = flag.reason === "other" ? "Other" : (LETTER_FLAG_LABELS[flag.reason] ?? flag.reason);
  return flag.note ? `${label}: ${flag.note}` : label;
}

// ---- files and letters -----------------------------------------------------------------

/** What the lens reads of a letter (`GET /letters/list`). */
export interface LetterInfo {
  id: string;
  letter: string;
  name_english: string;
  name_arabic: string;
  letter_number: number;
}

/** One playable file. */
export interface LetterFile {
  id: string;
  /** The Arabic the file says, from the library's display name (`أَبْ (carrier)` gives `أَبْ`). */
  title: string;
  /** The Latin note after it in the display name (`carrier`), if any. */
  variant: string | null;
  name: string;
  url: string | null;
  durationMs: number | null;
  tags: string[];
  /** The registry status; null when the file is not registered. */
  status: AudioAsset["status"];
  /** The text the voice was asked to say, when it was made with text to speech. */
  ttsText: string | null;
}

export interface LetterGroup {
  /** The letter id, or "" for files with no letter tag. */
  id: string;
  letter: LetterInfo | null;
  files: LetterFile[];
}

export interface LetterSoundData {
  file: LetterFile;
  /** "Ba · Fatha": the letter and the vowel, as the row and the hero say them. */
  label: string;
  flag: LetterSoundFlag | null;
  vowel: HarakaType | null;
  group: LetterGroup;
}

export type LetterItem = InboxItem<"letter", LetterSoundData>;

const HARAKA_SET = new Set<string>(HARAKA_IDS);
const NO_LETTER = 1_000;

/** "أَبْ (carrier)" → the Arabic and the note in brackets, so the Arabic renders RTL on its own. */
export function splitDisplayName(name: string): { title: string; variant: string | null } {
  const m = /^(.*?)\s*\(([^()]*[A-Za-z][^()]*)\)\s*$/.exec(name);
  return m && m[1].trim() ? { title: m[1].trim(), variant: m[2].trim() } : { title: name.trim(), variant: null };
}

function fromAsset(a: AudioAsset): LetterFile {
  const tts = a.metadata?.ttsText;
  return {
    id: a.id,
    ...splitDisplayName(a.displayName || a.name),
    name: a.name,
    url: a.url || null,
    durationMs: a.durationMs ?? null,
    tags: a.tags,
    status: a.status,
    ttsText: typeof tts === "string" ? tts : null,
  };
}

function fromFlagged(f: FlaggedFile): LetterFile {
  const tts = f.metadata?.ttsText;
  return {
    id: f.id,
    ...splitDisplayName(f.display_name || f.name),
    name: f.name,
    url: f.url || null,
    durationMs: f.duration_ms,
    tags: [],
    status: null,
    ttsText: typeof tts === "string" ? tts : null,
  };
}

/** The file's letter id: a tag that names a letter, else `metadata.letterId`. */
function letterIdOf(tags: readonly string[], letters: ReadonlyMap<string, LetterInfo>, metadata?: Record<string, unknown> | null): string {
  const tag = tags.find((t) => letters.has(t));
  if (tag) return tag;
  const fromMeta = metadata?.letterId;
  return typeof fromMeta === "string" ? fromMeta : "";
}

const vowelOf = (tags: readonly string[]) => (tags.find((t) => HARAKA_SET.has(t)) as HarakaType | undefined) ?? null;

/**
 * Every letter-sound file as an item, in alphabet order (by letter, then vowel,
 * then name). A flag whose file is no longer in the library still shows, from
 * the file the flag list carries.
 */
export function letterItems(
  assets: readonly AudioAsset[],
  flags: readonly LetterSoundFlag[],
  letters: readonly LetterInfo[],
): LetterItem[] {
  const byLetter = new Map(letters.map((l) => [l.id, l]));
  const openFlags = new Map(flags.filter((f) => !f.cleared_at).map((f) => [f.asset_id, f]));

  const rows: { file: LetterFile; letterId: string }[] = assets.map((a) => ({
    file: fromAsset(a),
    letterId: letterIdOf(a.tags, byLetter, a.metadata),
  }));
  const seen = new Set(rows.map((r) => r.file.id));
  for (const f of Array.from(openFlags.values())) {
    if (seen.has(f.asset_id) || !f.asset) continue;
    rows.push({ file: fromFlagged(f.asset), letterId: letterIdOf([], byLetter, f.asset.metadata) });
  }

  const vowelRank = (v: HarakaType | null) => (v ? HARAKA_IDS.indexOf(v) : HARAKA_IDS.length);
  const letterRank = (id: string) => byLetter.get(id)?.letter_number ?? (id ? NO_LETTER - 1 : NO_LETTER);
  rows.sort(
    (a, b) =>
      letterRank(a.letterId) - letterRank(b.letterId) ||
      a.letterId.localeCompare(b.letterId) ||
      vowelRank(vowelOf(a.file.tags)) - vowelRank(vowelOf(b.file.tags)) ||
      a.file.title.localeCompare(b.file.title) ||
      a.file.id.localeCompare(b.file.id),
  );

  const groups = new Map<string, LetterGroup>();
  for (const r of rows) {
    const g = groups.get(r.letterId) ?? { id: r.letterId, letter: byLetter.get(r.letterId) ?? null, files: [] };
    g.files.push(r.file);
    groups.set(r.letterId, g);
  }

  return rows.map(({ file, letterId }, i) => {
    const flag = openFlags.get(file.id) ?? null;
    const letter = byLetter.get(letterId) ?? null;
    const vowel = vowelOf(file.tags);
    const letterText = letter ? letter.name_english : letterId ? letterId : "No letter tag";
    const vowelText = vowel ? HARAKA_META[vowel].label : "";
    const label = [letterText, vowelText, file.variant].filter(Boolean).join(" · ");
    return {
      key: `letter:${file.id}`,
      kind: "letter",
      id: file.id,
      title: file.title,
      titleScript: "ar",
      state: flag ? "todo" : "listen",
      failedLabel: file.status === "broken" ? "File missing" : undefined,
      context: letterContext(label, flag, file),
      usage: 0,
      waitingSince: flag?.flagged_at ?? null,
      decidedBy: null,
      searchText: [letter?.letter, letter?.name_arabic, letterText, vowelText, file.variant, file.name, file.ttsText, ...file.tags].filter(Boolean).join(" "),
      bulkSafe: false,
      familyId: null,
      order: i,
      data: { file, label, flag, vowel, group: groups.get(letterId)! },
    };
  });
}

function letterContext(label: string, flag: LetterSoundFlag | null, file: LetterFile): string {
  const extra = flag ? `Flagged: ${flagLine(flag)}` : file.status === "broken" ? "file missing" : "";
  return [label, extra].filter(Boolean).join(" · ");
}

/** The item once its flag is set (or replaced) or cleared. */
export function withLetterFlag(item: LetterItem, flag: LetterSoundFlag | null): LetterItem {
  return {
    ...item,
    state: flag ? "todo" : "listen",
    context: letterContext(item.data.label, flag, item.data.file),
    waitingSince: flag?.flagged_at ?? null,
    data: { ...item.data, flag },
  };
}
