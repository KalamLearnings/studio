import { describe, it, expect } from "vitest";
import {
  blankSource,
  draftFromV1Pages,
  newPageId,
  newRevision,
  pageLabel,
  pageProblems,
  prepareSource,
  sourceChanged,
  V1_ASPECT_RATIO,
  wordSpans,
  type ReaderSourceContent,
} from "./readerSource";
import { linkWordInSource } from "./storyWords";

function source(pages: ReaderSourceContent["edition"]["pages"]): ReaderSourceContent {
  return { ...blankSource("The cat"), edition: { ...blankSource("The cat").edition, revision: "s1", pages } };
}

describe("wordSpans", () => {
  it("writes one span per whitespace-delimited token in UTF-16 offsets, punctuation and tokens whole", () => {
    expect(wordSpans("p1", "A {{word:qitt}} sat.")).toEqual([
      { id: "p1-w1", start: 0, end: 1 },
      { id: "p1-w2", start: 2, end: 15 },
      { id: "p1-w3", start: 16, end: 20 },
    ]);
  });

  it("keeps an Arabic word with its marks in one span and has no span for blank text", () => {
    const text = "The  قِطّ!";
    const spans = wordSpans("p2", text);
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual(["The", "قِطّ!"]);
    expect(wordSpans("p3", "  ")).toEqual([]);
  });
});

describe("prepareSource", () => {
  it("rewrites the spans from the text, drops source narration and sets the revision", () => {
    const linked = linkWordInSource(
      source([{ id: "p1", layout: "text", text: "A قِطّ sat.", words: [], narration: { url: "x" } }]),
      "قِطّ",
      "qitt",
    );
    const sent = prepareSource(linked, "s2");
    expect(sent.edition.revision).toBe("s2");
    expect(sent.edition.pages[0]).toEqual({
      id: "p1",
      layout: "text",
      text: "A {{word:qitt}} sat.",
      words: wordSpans("p1", "A {{word:qitt}} sat."),
    });
  });

  it("keeps the private assessment and the other edition fields", () => {
    const s = { ...source([{ id: "p1", layout: "text" as const, text: "Hi", words: [] }]) };
    s.edition.assessment = { id: "a1", question_count: 1 };
    s.assessment = { id: "a1", questions: [{ id: "q1", prompt: "?", choices: [{ id: "c1", text: "x" }, { id: "c2", text: "y" }], correct_choice_id: "c1" }] };
    const sent = prepareSource(s, "s9");
    expect(sent.assessment).toEqual(s.assessment);
    expect(sent.edition.assessment).toEqual({ id: "a1", question_count: 1 });
    expect([sent.edition.locale, sent.edition.reading_direction, sent.edition.schema_version]).toEqual(["en", "ltr", 1]);
  });
});

describe("sourceChanged", () => {
  it("ignores the revision, spans and narration; sees text changes", () => {
    const a = source([{ id: "p1", layout: "text", text: "Hi there", words: [] }]);
    const b = prepareSource(a, "other");
    expect(sourceChanged(a, b)).toBe(false);
    expect(sourceChanged(a, linkWordInSource(source([{ id: "p1", layout: "text", text: "Hi باب", words: [] }]), "باب", "bab"))).toBe(true);
  });
});

describe("draftFromV1Pages", () => {
  it("copies text and art in page order with a layout for each, and leaves v1 alone", () => {
    const v1 = [
      { page_number: 2, background_image_url: "https://img/2.png", text: "" },
      { page_number: 1, background_image_url: "https://img/1.png", text: "The cat." },
      { page_number: 3, background_image_url: null, text: "The end." },
    ];
    const copy = JSON.stringify(v1);
    const draft = draftFromV1Pages("The cat", v1);
    expect(draft.edition.title).toBe("The cat");
    expect(draft.edition.pages.map((p) => [p.id, p.layout, p.text, p.illustration?.url])).toEqual([
      ["p1", "below", "The cat.", "https://img/1.png"],
      ["p2", "image", "", "https://img/2.png"],
      ["p3", "text", "The end.", undefined],
    ]);
    expect(draft.edition.pages[0].illustration?.aspect_ratio).toBe(V1_ASPECT_RATIO);
    expect(JSON.stringify(v1)).toBe(copy);
  });

  it("starts with one blank page when v1 has none", () => {
    expect(draftFromV1Pages("Empty", []).edition.pages).toEqual([{ id: "p1", layout: "text", text: "", words: [] }]);
  });
});

describe("pageProblems", () => {
  it("names the schema rules an author can break, by page", () => {
    const problems = pageProblems(source([
      { id: "p1", layout: "below", text: "Hi", words: [] },
      { id: "p2", layout: "image", text: "words", words: [], illustration: { url: "http://img", alt: "", aspect_ratio: 0 } },
      { id: "p3", layout: "text", text: " ", words: [] },
    ]));
    expect(problems.map((p) => [pageLabel(p.path), p.message])).toEqual([
      ["Page 1", "This layout needs a picture."],
      ["Page 2", "The picture address must start with https://."],
      ["Page 2", "The picture shape (width / height) must be above 0 and at most 20."],
      ["Page 2", "A picture-only page has no text."],
      ["Page 3", "This page needs text."],
    ]);
  });

  it("finds nothing in a valid source and asks for a title", () => {
    const ok = source([{ id: "p1", layout: "full", text: "Hi", words: [], illustration: { url: "https://img", alt: "", aspect_ratio: 1.5 } }]);
    expect(pageProblems(ok)).toEqual([]);
    expect(pageProblems({ ...ok, edition: { ...ok.edition, title: " " } }).map((p) => p.message)).toEqual(["The book needs a title."]);
  });
});

describe("ids", () => {
  it("newPageId skips ids in use; newRevision is a short stable id", () => {
    expect(newPageId([{ id: "p1" }, { id: "p3" }])).toBe("p4");
    expect(newPageId([{ id: "p1" }, { id: "p2" }])).toBe("p3");
    expect(newRevision(new Date(1_700_000_000_000))).toBe("s-loyw3v28");
  });
});
