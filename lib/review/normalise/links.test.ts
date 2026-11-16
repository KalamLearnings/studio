import { describe, expect, it } from "vitest";
import { familyProposal, pictureProposal } from "./links.fixtures";
import { familyProposalBulkSafe, humaniseSlug, linkItems } from "./links";

const none = { skipped: new Set<string>(), applied: new Set<string>() };

describe("linkItems", () => {
  it("makes one item per proposal, in plain words", () => {
    const items = linkItems({ families: [familyProposal()], pictures: [pictureProposal()] }, none);
    expect(items.map((i) => i.key)).toEqual(["link:family:w-kitab", "link:picture:a-1"]);
    expect(items[0].title).toBe("كِتَاب");
    expect(items[0].context).toMatch(/^These look like forms of one word: 2 spellings/);
    expect(items[1].context).toBe("This picture looks like this meaning: Sea lion (a new meaning)");
    expect(items[1].titleScript).toBe("ar");
    expect(items.every((i) => i.state === "todo")).toBe(true);
  });
  it("shows skipped ones as decided, and applied ones as approved", () => {
    const items = linkItems(
      { families: [familyProposal()], pictures: [pictureProposal()] },
      { skipped: new Set(["family:w-kitab"]), applied: new Set(["picture:a-1"]) },
    );
    expect(items.map((i) => i.state)).toEqual(["rejected", "approved"]);
  });
  it("lets only headword and case-variant families with a unique id go in bulk", () => {
    expect(familyProposalBulkSafe(familyProposal())).toBe(true);
    expect(familyProposalBulkSafe(familyProposal({ slug_clash: true }))).toBe(false);
    expect(familyProposalBulkSafe(familyProposal({ slug: null }))).toBe(false);
    const withReading = familyProposal({
      members: [...familyProposal().members, { id: "w-ktb", arabic: "كتاب", reason: "reads_as", of: "w-kitab", family_id: null, reads_as_id: null }],
    });
    expect(familyProposalBulkSafe(withReading)).toBe(false);
    const [, pic] = linkItems({ families: [familyProposal()], pictures: [pictureProposal()] }, none);
    expect(pic.bulkSafe).toBe(false);
  });
  it("humanises slugs", () => {
    expect(humaniseSlug("sea-lion")).toBe("Sea lion");
    expect(humaniseSlug("cat")).toBe("Cat");
  });
});
