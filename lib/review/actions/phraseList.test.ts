import { describe, expect, it } from "vitest";
import type { InboxPhraseEntry, InboxPhraseList } from "../normalise/sources";
import { withApproved, withPending, withRejected } from "./phraseList";

const e = (key: string, over: Partial<InboxPhraseEntry> = {}): InboxPhraseEntry => ({
  phrase_key: key,
  word_ids: key.split(" "),
  is_sentence: false,
  text: "فِي البَيْتِ",
  word_problems: [],
  used_in: [],
  approval: null,
  reason: "unreviewed",
  rejection: null,
  ...over,
});

const list = (): InboxPhraseList => ({
  pending: [e("a b"), e("c d")],
  approved: [e("e f", { reason: null, approval: { reviewed_by: "u", reviewed_at: "t", is_sentence: false }, audio: { state: "served" } })],
  rejected: [e("g h", { reason: null, rejection: { reason: "unnatural" } })],
  generation_enabled: true,
});

const keys = (l: InboxPhraseList) => [l.pending, l.approved, l.rejected ?? []].map((s) => s.map((x) => x.phrase_key));

describe("phrase list after a decision", () => {
  it("moves an approved phrase out of pending, with the server's approval", () => {
    const l = withApproved(list(), e("a b"), { approval: { reviewed_by: "me", reviewed_at: "now", is_sentence: false } });
    expect(keys(l)).toEqual([["c d"], ["e f", "a b"], ["g h"]]);
    expect(l.approved[1]).toMatchObject({ reason: null, approval: { reviewed_by: "me" }, audio: { state: "none" } });
    expect(l.generation_enabled).toBe(true);
  });
  it("makes a revoked or cleared phrase pending again", () => {
    expect(keys(withPending(list(), e("e f")))).toEqual([["a b", "c d", "e f"], [], ["g h"]]);
    const cleared = withPending(list(), e("g h"));
    expect(keys(cleared)).toEqual([["a b", "c d", "g h"], ["e f"], []]);
    expect(cleared.pending[2]).toMatchObject({ reason: "unreviewed", rejection: null });
  });
  it("rejects with the server's rejection when it sent one", () => {
    const l = withRejected(list(), e("a b"), { reason: "other", note: "mine" }, {
      rejection: { reason: "other", note: "server", reviewed_by: "me", reviewed_at: "now" },
    });
    expect(keys(l)).toEqual([["c d"], ["e f"], ["g h", "a b"]]);
    expect(l.rejected?.[1].rejection).toMatchObject({ note: "server", reviewed_by: "me" });
    expect(withRejected({ pending: [e("a b")], approved: [] }, e("a b"), { reason: "unnatural" }).rejected).toHaveLength(1);
  });
});
