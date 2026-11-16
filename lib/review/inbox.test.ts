import { describe, expect, it } from "vitest";
import {
  canDecide,
  countInbox,
  foldForSearch,
  inLens,
  isLens,
  matchesSearch,
  moveSelection,
  nextAfterDecision,
  nextStatus,
  shortAge,
  sortItems,
  statusPill,
  visibleItems,
  waitingSummary,
  type InboxItem,
  type InboxKind,
  type LensContext,
  type ReviewRoles,
} from "./inbox";

const item = (key: string, over: Partial<InboxItem> = {}): InboxItem => {
  const kind = (over.kind ?? "spelling") as InboxKind;
  return {
    key: `${kind}:${key}`,
    kind,
    id: key,
    title: "كِتَاب",
    titleScript: "ar",
    state: "todo",
    context: "",
    usage: 0,
    waitingSince: null,
    searchText: "",
    bulkSafe: false,
    familyId: null,
    data: null,
    ...over,
  };
};

const ALL: ReviewRoles = { curriculumLead: true, phraseReviewer: true };
const STAFF: ReviewRoles = { curriculumLead: false, phraseReviewer: false };
const ctx: LensContext = { userId: "me", decidedHere: new Set() };

describe("roles", () => {
  it("lets staff decide staff kinds only", () => {
    expect(canDecide("staff", STAFF)).toBe(true);
    expect(canDecide("lead", STAFF)).toBe(false);
    expect(canDecide("phrase", STAFF)).toBe(false);
  });
  it("treats a curriculum lead as a phrase reviewer", () => {
    expect(canDecide("phrase", { curriculumLead: true, phraseReviewer: false })).toBe(true);
    expect(canDecide("lead", { curriculumLead: false, phraseReviewer: true })).toBe(false);
  });
});

describe("statusPill", () => {
  it("names the decided states per kind", () => {
    expect(statusPill(item("a", { state: "approved", kind: "reading" }), ALL).text).toBe("Confirmed");
    expect(statusPill(item("a", { state: "approved", kind: "request" }), ALL).text).toBe("Fulfilled");
    expect(statusPill(item("a", { state: "rejected", kind: "request" }), ALL).text).toBe("Declined");
    expect(statusPill(item("a", { state: "noted_pseudo" }), ALL)).toEqual({ tone: "no", text: "Noted: not a word" });
  });
  it("says who decides when your role cannot", () => {
    expect(statusPill(item("a", { kind: "draft" }), STAFF)).toEqual({ tone: "gate", text: "Lead decides" });
    expect(statusPill(item("a", { kind: "phrase" }), STAFF)).toEqual({ tone: "gate", text: "Reviewer decides" });
    expect(statusPill(item("a", { kind: "draft" }), ALL)).toEqual({ tone: "todo", text: "Waiting" });
  });
  it("uses the item's own to-decide and failed labels", () => {
    expect(statusPill(item("a", { kind: "phrase", todoLabel: "Confirm again" }), ALL).text).toBe("Confirm again");
    expect(statusPill(item("a", { kind: "blend", state: "failed", failedLabel: "Not voiceable" }), ALL).text).toBe("Not voiceable");
  });
});

describe("countInbox", () => {
  const items = [
    item("s1"),
    item("s2", { state: "approved" }),
    item("d1", { kind: "draft" }),
    item("b1", { kind: "blend", state: "failed" }),
    item("l1", { kind: "letter", state: "listen" }),
  ];
  it("counts what waits, per kind, and splits yours from another role's", () => {
    const c = countInbox(items, STAFF);
    expect(c.all).toBe(3);
    expect(c.yours).toBe(2);
    expect(c.byKind.spelling).toBe(1);
    expect(c.byKind.draft).toBe(1);
    expect(c.byKind.blend).toBe(1);
    expect(c.byKind.letter).toBe(1);
    expect(waitingSummary(c)).toBe("3 decisions waiting, 2 yours, 1 for another role");
  });
  it("counts a flagged letter sound as waiting, for a phrase reviewer", () => {
    const letters = [item("l1", { kind: "letter", state: "listen" }), item("l2", { kind: "letter", state: "todo" })];
    expect(countInbox(letters, STAFF)).toMatchObject({ all: 1, yours: 0, byKind: { letter: 2 } });
    expect(countInbox(letters, ALL)).toMatchObject({ all: 1, yours: 1 });
    expect(statusPill(letters[1], ALL).text).toBe("To decide");
    expect(statusPill(letters[1], STAFF).text).toBe("Reviewer decides");
    expect(statusPill(letters[0], STAFF).text).toBe("Listen");
  });
  it("says so when nothing waits", () => {
    expect(waitingSummary(countInbox([item("s", { state: "approved" })], ALL))).toBe("Nothing waits for a decision");
    expect(waitingSummary(countInbox([item("s")], ALL))).toBe("1 decision waiting");
  });
});

describe("search", () => {
  it("folds harakat both ways", () => {
    expect(foldForSearch("كِتَابٌ")).toBe("كتاب");
    expect(matchesSearch(item("a", { title: "كِتَاب" }), "كتاب")).toBe(true);
    expect(matchesSearch(item("a", { title: "كتاب" }), "كِتَاب")).toBe(true);
    expect(matchesSearch(item("a", { title: "بَاب" }), "كتاب")).toBe(false);
  });
  it("folds hamza seats, ta marbuta and alif maqsura", () => {
    expect(foldForSearch("أَسَد")).toBe(foldForSearch("اسد"));
    expect(foldForSearch("إِبْرِيق")).toBe("ابريق");
    expect(foldForSearch("آ")).toBe("ا");
    expect(foldForSearch("زَرَافَة")).toBe(foldForSearch("زرافه"));
    expect(foldForSearch("مُوسَى")).toBe(foldForSearch("موسي"));
    expect(matchesSearch(item("a", { title: "أَرْنَب" }), "ارنب")).toBe(true);
  });
  it("looks at ids and the extra search text, case-insensitively", () => {
    expect(matchesSearch(item("word_123"), "WORD_1")).toBe(true);
    expect(matchesSearch(item("a", { searchText: "Book family" }), "book")).toBe(true);
    expect(matchesSearch(item("a"), "  ")).toBe(true);
  });
});

describe("lenses and status", () => {
  it("knows its lenses", () => {
    expect(isLens("spelling")).toBe(true);
    expect(isLens("v-mine")).toBe(true);
    expect(isLens("lib-families")).toBe(true);
    expect(isLens("nope")).toBe(false);
  });
  it("keeps letter sounds out of Everything while deciding, unless flagged", () => {
    const l = item("l", { kind: "letter", state: "listen" });
    expect(inLens(l, "all", "todo", ctx)).toBe(false);
    expect(inLens(l, "all", "all", ctx)).toBe(true);
    expect(inLens(item("f", { kind: "letter", state: "todo" }), "all", "todo", ctx)).toBe(true);
  });
  it("finds what you decided, here or on the server", () => {
    const here = item("a", { state: "approved" });
    const server = item("b", { state: "approved", decidedBy: "me" });
    const other = item("c", { state: "approved", decidedBy: "you" });
    const c = { userId: "me", decidedHere: new Set([here.key]) };
    expect([here, server, other].filter((it) => inLens(it, "v-mine", "all", c)).map((it) => it.id)).toEqual(["a", "b"]);
  });
  it("Flagged by check shows the spellings an automatic check flags (CM-AIPRE)", () => {
    expect(isLens("v-check")).toBe(true);
    const flagged = item("f", { checkFlagged: true });
    const decided = item("d", { checkFlagged: true, state: "approved" });
    const plain = item("p");
    const items = [plain, flagged, decided];
    const q = { lens: "v-check" as const, status: "todo" as const, sort: "usage" as const, q: "" };
    expect(visibleItems(items, q, ctx).map((i) => i.id)).toEqual(["f"]);
    expect(visibleItems(items, { ...q, status: "all" }, ctx).map((i) => i.id).sort()).toEqual(["d", "f"]);
  });
  it("cycles the status", () => {
    expect(nextStatus("todo")).toBe("done");
    expect(nextStatus("done")).toBe("all");
    expect(nextStatus("all")).toBe("todo");
  });
  it("filters, searches and sorts together", () => {
    const items = [
      item("a", { usage: 1 }),
      item("b", { usage: 5, state: "approved" }),
      item("c", { usage: 3 }),
      item("r", { kind: "reading", usage: 9 }),
    ];
    const q = { lens: "spelling" as const, status: "todo" as const, sort: "usage" as const, q: "" };
    expect(visibleItems(items, q, ctx).map((i) => i.id)).toEqual(["c", "a"]);
    expect(visibleItems(items, { ...q, lens: "all" }, ctx).map((i) => i.id)).toEqual(["r", "c", "a"]);
    expect(visibleItems(items, { ...q, status: "done" }, ctx).map((i) => i.id)).toEqual(["b"]);
  });
});

describe("sortItems", () => {
  const a = item("a", { usage: 2, waitingSince: "2026-11-10T00:00:00Z" });
  const b = item("b", { usage: 2, waitingSince: "2026-11-01T00:00:00Z" });
  const c = item("c", { usage: 7, waitingSince: null, kind: "reading" });
  it("puts the most used first, then the longest waiting", () => {
    expect(sortItems([a, b, c], "usage").map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
  it("sorts by waiting time either way, unknown times last", () => {
    expect(sortItems([a, c, b], "oldest").map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(sortItems([c, b, a], "newest").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
  it("can put the spellings an automatic check flags first, then the most used", () => {
    const f = item("f", { usage: 1, checkFlagged: true });
    const g = item("g", { usage: 3, checkFlagged: true });
    expect(sortItems([a, c, f, b, g], "check").map((i) => i.id)).toEqual(["g", "f", "c", "b", "a"]);
  });
  it("groups by kind in rail order", () => {
    expect(sortItems([c, a, b], "kind").map((i) => i.kind)).toEqual(["spelling", "spelling", "reading"]);
  });
});

describe("selection", () => {
  const list = [item("a"), item("b", { state: "approved" }), item("c"), item("d")];
  it("goes to the next waiting item below, else above, else nowhere", () => {
    expect(nextAfterDecision(list, "spelling:a")).toBe("spelling:c");
    expect(nextAfterDecision(list, "spelling:d")).toBe("spelling:a");
    expect(nextAfterDecision([item("a")], "spelling:a")).toBeNull();
  });
  it("moves with j and k, clamped", () => {
    expect(moveSelection(list, null, 1)).toBe("spelling:a");
    expect(moveSelection(list, "spelling:a", -1)).toBe("spelling:a");
    expect(moveSelection(list, "spelling:c", 1)).toBe("spelling:d");
    expect(moveSelection(list, "spelling:d", 1)).toBe("spelling:d");
    expect(moveSelection([], null, 1)).toBeNull();
  });
});

describe("shortAge", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  it("speaks in minutes, hours and days", () => {
    expect(shortAge("2026-11-16T11:59:40Z", now)).toBe("just now");
    expect(shortAge("2026-11-16T11:20:00Z", now)).toBe("40 min");
    expect(shortAge("2026-11-16T09:00:00Z", now)).toBe("3 h");
    expect(shortAge("2026-11-07T12:00:00Z", now)).toBe("9 d");
    expect(shortAge(null, now)).toBe("");
    expect(shortAge("not a date", now)).toBe("");
  });
});
