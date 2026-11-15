import { describe, it, expect } from "vitest";
import {
  arabicRuns,
  displayStoryText,
  groupUnlinked,
  issuesByPath,
  linkedWordIds,
  linkRunInText,
  linkWordInSource,
  parseStoryWordsError,
  parseStoryWordWarnings,
  plainStoryWordIssue,
  storyPathLabel,
  storyTexts,
  unlinkedWords,
  unlinkWordInSource,
  wordToken,
  wordTokenIds,
  type StorySource,
} from "./storyWords";

const FATHA = "َ";
const KITAB = "كتاب";
const KITAB_TATWEEL = "كتـاب";
const BAB = "باب";

const library = [
  { id: "w_kitab", arabic: KITAB, created_at: "2026-01-01" },
  { id: "w_old", arabic: "قمر", created_at: "2026-01-01", retired_at: "2026-10-01" },
];

function source(): StorySource {
  return {
    edition: {
      title: `Sami and the ${KITAB}`,
      pages: [
        { text: `Sami reads a ${KITAB}. The ${KITAB_TATWEEL} is red.`, illustration: { alt: `A ${BAB}` } },
        { text: "", illustration: null },
        { text: `The moon, قمر, is up.` },
      ],
    },
    assessment: {
      questions: [{ prompt: `What is a ${KITAB}?`, choices: [{ text: "A book" }, { text: BAB }] }],
    },
  };
}

describe("tokens", () => {
  it("writes and reads {{word:<id>}}", () => {
    expect(wordToken("w_1")).toBe("{{word:w_1}}");
    expect(wordTokenIds("a {{word:w_1}} b {{word:w-2}} {{word:w_1}}")).toEqual(["w_1", "w-2", "w_1"]);
    expect(wordTokenIds("{{word:bad id}}")).toEqual([]);
  });
});

describe("storyTexts", () => {
  it("lists every non-blank text at the backend's item paths", () => {
    expect(storyTexts(source()).map((t) => t.path)).toEqual([
      "edition.title",
      "edition.pages[0].text",
      "edition.pages[0].illustration.alt",
      "edition.pages[2].text",
      "assessment.questions[0].prompt",
      "assessment.questions[0].choices[0].text",
      "assessment.questions[0].choices[1].text",
    ]);
  });

  it("names each location for the author", () => {
    expect(storyPathLabel("edition.title")).toBe("Title");
    expect(storyPathLabel("edition.pages[0].text")).toBe("Page 1 text");
    expect(storyPathLabel("edition.pages[3].illustration.alt")).toBe("Page 4 alt text");
    expect(storyPathLabel("assessment.questions[0].prompt")).toBe("Question 1");
    expect(storyPathLabel("assessment.questions[1].choices[2].text")).toBe("Question 2, choice 3");
    expect(storyPathLabel("other")).toBe("other");
  });
});

describe("arabicRuns", () => {
  it("finds Arabic-script runs with UTF-16 offsets, harakat included", () => {
    const text = `A ${"ب" + FATHA + "اب"}, then ${KITAB}.`;
    const runs = arabicRuns(text);
    expect(runs.map((r) => r.text)).toEqual(["ب" + FATHA + "اب", KITAB]);
    for (const r of runs) expect(text.slice(r.start, r.end)).toBe(r.text);
  });

  it("skips tokens", () => {
    expect(arabicRuns(`{{word:w_kitab}} and ${BAB}`).map((r) => r.text)).toEqual([BAB]);
    expect(arabicRuns("No Arabic here")).toEqual([]);
  });
});

describe("unlinkedWords", () => {
  it("matches each run exactly, then by the normalised spelling, else as new", () => {
    const items = unlinkedWords(source(), library);
    const byText = (t: string) => items.find((i) => i.text === t)!;
    expect(byText(KITAB).match).toMatchObject({ kind: "exact", word: { id: "w_kitab" } });
    expect(byText(KITAB_TATWEEL).match).toMatchObject({ kind: "reuse", word: { id: "w_kitab" } });
    expect(byText(BAB).match).toMatchObject({ kind: "new", spelling: BAB });
  });

  it("never offers a retired word", () => {
    const moon = unlinkedWords(source(), library).find((i) => i.text === "قمر")!;
    expect(moon.match.kind).toBe("new");
  });

  it("groups repeats so one confirmation links every place", () => {
    const groups = groupUnlinked(unlinkedWords(source(), library));
    const kitab = groups.find((g) => g.text === KITAB)!;
    expect(kitab.paths).toEqual(["edition.title", "edition.pages[0].text", "assessment.questions[0].prompt"]);
    expect(groups.map((g) => g.text)).toEqual([KITAB, KITAB_TATWEEL, BAB, "قمر"]);
  });
});

describe("linking", () => {
  it("replaces the matching runs of a text and leaves the rest", () => {
    expect(linkRunInText(`${KITAB} and ${KITAB}, ${BAB}`, KITAB, "w_kitab")).toBe(
      `{{word:w_kitab}} and {{word:w_kitab}}, ${BAB}`,
    );
    expect(linkRunInText(`${KITAB}ي`, KITAB, "w_kitab")).toBe(`${KITAB}ي`);
  });

  it("links a word in every location of the source, without changing the input", () => {
    const before = source();
    const after = linkWordInSource(before, KITAB, "w_kitab");
    expect(before.edition.title).toBe(`Sami and the ${KITAB}`);
    expect(after.edition.title).toBe("Sami and the {{word:w_kitab}}");
    expect(after.edition.pages[0].text).toBe(`Sami reads a {{word:w_kitab}}. The ${KITAB_TATWEEL} is red.`);
    expect(after.assessment!.questions[0].prompt).toBe("What is a {{word:w_kitab}}?");
    expect(after.edition.pages[1].illustration).toBeNull();
    expect(linkedWordIds(after)).toEqual(["w_kitab"]);
    expect(unlinkedWords(after, library).map((i) => i.text)).not.toContain(KITAB);
  });

  it("unlinks a word back to a spelling", () => {
    const linked = linkWordInSource(source(), KITAB, "w_kitab");
    expect(unlinkWordInSource(linked, "w_kitab", KITAB)).toEqual(source());
  });

  it("shows tokens as their spellings", () => {
    const spelling = (id: string) => (id === "w_kitab" ? KITAB : undefined);
    expect(displayStoryText("a {{word:w_kitab}} {{word:gone}}", spelling)).toBe(`a ${KITAB} {{word:gone}}`);
  });
});

describe("server issues", () => {
  const issues = [
    { code: "unknown_word", path: "edition.pages[2].text", wordId: "w_x" },
    { code: "retired_word", path: "edition.title", wordId: "w_old" },
    { code: "malformed_token", path: "edition.pages[2].text" },
    { code: "arabic_text", path: "edition.title", text: BAB },
  ];

  it("reads a READER_WORDS_INVALID refusal", () => {
    expect(parseStoryWordsError({ code: "READER_WORDS_INVALID", details: { issues } })).toEqual(issues);
    expect(parseStoryWordsError({ code: "OTHER", details: { issues } })).toBeNull();
    expect(parseStoryWordsError(null)).toBeNull();
  });

  it("reads the warnings of a source response and drops junk", () => {
    expect(parseStoryWordWarnings([issues[3], { code: "x", path: "y" }, null])).toEqual([issues[3]]);
    expect(parseStoryWordWarnings(undefined)).toEqual([]);
  });

  it("groups by location and says each in plain words", () => {
    const parsed = parseStoryWordWarnings(issues);
    expect([...issuesByPath(parsed).keys()]).toEqual(["edition.pages[2].text", "edition.title"]);
    expect(parsed.map((i) => plainStoryWordIssue(i, (id) => (id === "w_old" ? "قمر" : undefined)))).toEqual([
      "The word w_x is not in the word bank.",
      'The word "قمر" (w_old) is retired. Link another word.',
      "A word reference is not written {{word:<id>}}.",
      `"${BAB}" is not linked to a word bank word.`,
    ]);
  });
});
