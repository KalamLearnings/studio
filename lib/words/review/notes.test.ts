import { describe, expect, it, vi } from "vitest";
import { reconcileNotes } from "./notes";
import type { ReviewNote } from "./queue";

const pseudo = (wordId: string): ReviewNote => ({ wordId, decision: "pseudo" });
const wrong = (wordId: string, correctedSpelling: string): ReviewNote => ({
  wordId,
  decision: "wrong",
  correctedSpelling,
});

describe("reconcileNotes", () => {
  it("uploads only the local notes the server lacks, and shows all", async () => {
    const upload = vi.fn(async (n: ReviewNote) => n);
    const out = await reconcileNotes({
      server: [pseudo("a")],
      local: [wrong("a", "x"), pseudo("b"), pseudo("b")],
      upload,
    });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(pseudo("b"));
    expect(out.notes).toEqual([pseudo("a"), pseudo("b")]);
    expect(out.pending).toEqual([]);
  });

  it("keeps a note whose upload failed, shown and pending, and still uploads the others", async () => {
    const upload = vi.fn(async (n: ReviewNote) => {
      if (n.wordId === "bad") throw new Error("offline");
      return n;
    });
    const out = await reconcileNotes({ server: [], local: [pseudo("bad"), pseudo("ok")], upload });
    expect(out.pending).toEqual([pseudo("bad")]);
    expect(out.notes.map((n) => n.wordId).sort()).toEqual(["bad", "ok"]);
  });

  it("does nothing when there is nothing local", async () => {
    const upload = vi.fn();
    const out = await reconcileNotes({ server: [pseudo("a")], local: [], upload });
    expect(upload).not.toHaveBeenCalled();
    expect(out).toEqual({ notes: [pseudo("a")], pending: [] });
  });
});
