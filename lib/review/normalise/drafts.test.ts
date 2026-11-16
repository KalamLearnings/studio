import { describe, expect, it } from "vitest";
import { labelItems, meaningBulkSafe, meaningItems } from "./drafts";
import { labelDraft, meaningDraft } from "./drafts.fixtures";

const none = { skipped: new Set<string>() };

describe("meaningItems", () => {
  it("titles by the spelling and says where the meaning goes", () => {
    const [item] = meaningItems([meaningDraft()], none);
    expect(item).toMatchObject({
      key: "meaning:w-kitab",
      kind: "meaning",
      id: "w-kitab",
      title: "كِتَاب",
      titleScript: "ar",
      state: "todo",
      usage: 12,
      bulkSafe: true,
      familyId: null,
    });
    expect(item.context).toBe('"book" (noun), high confidence, starts a new word');
  });

  it("says when it replaces a meaning, and is then not bulk-safe", () => {
    const d = meaningDraft({ family: { id: "book", headword_id: "w-kitab", gloss_en: "a book" } });
    const [item] = meaningItems([d], none);
    expect(item.context).toContain('replaces "a book"');
    expect(item.bulkSafe).toBe(false);
    expect(item.familyId).toBe("book");
  });

  it("is decided once applied, skipped once skipped", () => {
    expect(meaningItems([meaningDraft({ applied: true })], none)[0].state).toBe("approved");
    expect(meaningItems([meaningDraft()], { skipped: new Set(["meaning:w-kitab"]) })[0].state).toBe("rejected");
  });
});

describe("meaningBulkSafe", () => {
  it("is high confidence, a real word, and no meaning to replace", () => {
    expect(meaningBulkSafe(meaningDraft())).toBe(true);
    expect(meaningBulkSafe(meaningDraft({ confidence: "medium" }))).toBe(false);
    expect(meaningBulkSafe(meaningDraft({ word: null }))).toBe(false);
    expect(meaningBulkSafe(meaningDraft({ word: { ...meaningDraft().word!, is_pseudo: true } }))).toBe(false);
    expect(meaningBulkSafe(meaningDraft({ family: { id: "book", headword_id: null, gloss_en: null } }))).toBe(true);
    expect(meaningBulkSafe(meaningDraft({ family: { id: "book", headword_id: null, gloss_en: "x" } }))).toBe(false);
  });
});

describe("labelItems", () => {
  it("is titled by the meaning and is never bulk-safe", () => {
    const [item] = labelItems([labelDraft()], none);
    expect(item).toMatchObject({ key: "label:a1", kind: "label", title: "Cat", titleScript: "latin", bulkSafe: false, state: "todo" });
    expect(item.context).toContain("(a new meaning)");
    expect(item.searchText).toContain("cat");
  });
  it("says when no word names it yet", () => {
    const [item] = labelItems([labelDraft({ word_id: null, word: null, arabic: null, needs_word: true })], none);
    expect(item.context).toContain("no word yet");
  });
});
