import { describe, expect, it } from "vitest";
import { canBulk } from "./bulk";
import { linkItems } from "./normalise/links";
import { familyProposal, pictureProposal } from "./normalise/links.fixtures";

const none = { skipped: new Set<string>(), applied: new Set<string>() };
const [family, picture] = linkItems({ families: [familyProposal()], pictures: [pictureProposal()] }, none);
const staff = { curriculumLead: false, phraseReviewer: false };
const reviewer = { curriculumLead: false, phraseReviewer: true };

describe("bulk approve of suggested links", () => {
  it("takes case-ending families, never pictures", () => {
    expect(canBulk(family)).toBe(true);
    expect(canBulk(picture)).toBe(false);
  });
  it("needs a reviewer when the roles are given", () => {
    expect(canBulk(family, staff)).toBe(false);
    expect(canBulk(family, reviewer)).toBe(true);
  });
});
