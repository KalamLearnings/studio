import { describe, expect, it } from "vitest";
import type { AudioAsset } from "../../types/audio";
import { sortItems, statusPill, type ReviewRoles } from "../inbox";
import { flagLine, letterFlagBody, splitDisplayName, letterItems, withLetterFlag, type LetterInfo, type LetterSoundFlag } from "./letters";

const asset = (id: string, displayName: string, tags: string[], over: Partial<AudioAsset> = {}): AudioAsset =>
  ({
    id,
    name: `${id}.mp3`,
    displayName,
    url: `https://cdn/${id}.mp3`,
    storagePath: `audio/letter_sounds/${id}.mp3`,
    category: "letter_sounds",
    tags,
    mimeType: "audio/mpeg",
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    status: "active",
    label: null,
    metadata: { ttsText: displayName },
    ...over,
  }) as AudioAsset;

const LETTERS: LetterInfo[] = [
  { id: "alif", letter: "ا", name_english: "Alif", name_arabic: "ألِف", letter_number: 1 },
  { id: "ba", letter: "ب", name_english: "Ba", name_arabic: "باء", letter_number: 2 },
];
const ALL: ReviewRoles = { curriculumLead: true, phraseReviewer: true };

const flag = (asset_id: string, over: Partial<LetterSoundFlag> = {}): LetterSoundFlag => ({
  asset_id,
  reason: "wrong_vowel",
  note: "says bi",
  flagged_by: "rev",
  flagged_at: "2026-11-16T09:00:00Z",
  cleared_by: null,
  cleared_at: null,
  ...over,
});

const assets = [
  asset("b-kasra", "بي", ["kasra", "ba"]),
  asset("none", "test", []),
  asset("b-fatha", "بَـا", ["ba", "fatha"]),
  asset("a-fatha", "اَـا", ["alif", "fatha"], { status: "broken" }),
];

describe("letterItems", () => {
  const items = letterItems(assets, [flag("b-kasra")], LETTERS);

  it("orders the files by letter, then vowel, with untagged files last", () => {
    expect(items.map((i) => i.id)).toEqual(["a-fatha", "b-fatha", "b-kasra", "none"]);
    expect(sortItems([...items].reverse(), "usage").map((i) => i.id)).toEqual(["b-kasra", "a-fatha", "b-fatha", "none"]);
  });
  it("groups the files of a letter, and names the letter and the vowel", () => {
    const ba = items.find((i) => i.id === "b-fatha")!;
    expect(ba.data.group.files.map((f) => f.id)).toEqual(["b-fatha", "b-kasra"]);
    expect(ba.data.group.letter?.letter).toBe("ب");
    expect(ba).toMatchObject({ key: "letter:b-fatha", title: "بَـا", state: "listen", context: "Ba · Fatha" });
    expect(items[3]).toMatchObject({ context: "No letter tag", data: { group: { id: "", letter: null } } });
  });
  it("makes a flagged file wait, with its flag", () => {
    const b = items.find((i) => i.id === "b-kasra")!;
    expect(b).toMatchObject({ state: "todo", context: "Ba · Kasra · Flagged: Wrong vowel: says bi", waitingSince: "2026-11-16T09:00:00Z" });
    expect(statusPill(b, ALL).text).toBe("To decide");
  });
  it("marks a missing file for the Failed audio view", () => {
    expect(items[0]).toMatchObject({ failedLabel: "File missing", context: "Alif · Fatha · file missing" });
    expect(items[1].failedLabel).toBeUndefined();
  });
  it("ignores cleared flags and keeps a flag whose file left the library", () => {
    const gone = flag("gone", {
      asset: { id: "gone", name: "gone.mp3", display_name: "تَ", storage_path: "x", url: "https://cdn/gone.mp3", duration_ms: 500, metadata: { letterId: "ba" } },
    });
    const out = letterItems([], [gone, flag("b-kasra", { cleared_at: "2026-11-16T10:00:00Z" })], LETTERS);
    expect(out.map((i) => [i.id, i.state, i.data.group.id])).toEqual([["gone", "todo", "ba"]]);
  });
  it("keeps the Latin note of a display name out of the Arabic title", () => {
    const [carrier] = letterItems([asset("c", "أَبْ (carrier)", ["ba", "sukoon"])], [], LETTERS);
    expect(carrier).toMatchObject({ title: "أَبْ", context: "Ba · Sukoon · carrier" });
    expect(splitDisplayName("اِ")).toEqual({ title: "اِ", variant: null });
  });
  it("searches the letter, its names and the tags", () => {
    expect(items[1].searchText).toContain("باء");
    expect(items[1].searchText).toContain("fatha");
  });
});

describe("the flag", () => {
  it("checks the body as the backend does", () => {
    expect(letterFlagBody("", "")).toEqual({ ok: false, error: "Pick a reason." });
    expect(letterFlagBody("other", "  ")).toMatchObject({ ok: false });
    expect(letterFlagBody("other", " clipped ")).toEqual({ ok: true, body: { reason: "other", note: "clipped" } });
    expect(letterFlagBody("noise", "  ")).toEqual({ ok: true, body: { reason: "noise" } });
    expect(letterFlagBody("noise", "x".repeat(501))).toMatchObject({ ok: false });
  });
  it("reads as one line", () => {
    expect(flagLine({ reason: "cut_off", note: null })).toBe("Cut off");
    expect(flagLine({ reason: "other", note: "clipped" })).toBe("Other: clipped");
  });
  it("sets and clears on the item", () => {
    const [item] = letterItems([asset("b", "بَـا", ["ba", "fatha"])], [], LETTERS);
    const flagged = withLetterFlag(item, flag("b", { reason: "noise", note: null }));
    expect(flagged).toMatchObject({ state: "todo", context: "Ba · Fatha · Flagged: Noise" });
    expect(withLetterFlag(flagged, null)).toMatchObject({ state: "listen", context: "Ba · Fatha", waitingSince: null });
  });
});
