/**
 * Normalisers for the sources whose panes come in later tickets (CW-2):
 * blend splits (CW-6), AI drafts and word requests (CW-7), phrases and
 * recordings (CW-8). Pure. Each turns one source's rows into `InboxItem`s with
 * the rules the old pages use (`matchesFilter`, `draftStatus`, `takeToReview`),
 * so a pane only has to render `item.data`.
 */

import { matchesFilter, type BlendReviewWord } from "../../blendWord/review";
import { draftStatus, GENERATION_TYPES, type DraftRow, type WordRequest } from "../../generation/drafts";
import { takeToReview, type PhraseAudioStatus } from "../../phrases/phraseAudio";
import { reasonText, type PhraseEntry, type PhraseList } from "../../phrases/phraseReview";
import type { InboxItem, ItemState } from "../inbox";

// ---- blend (GET /words/blend/review) ------------------------------------------------

export type BlendItem = InboxItem<"blend", BlendReviewWord>;

export function blendItems(words: readonly BlendReviewWord[]): BlendItem[] {
  return words.map((w) => {
    const waits = matchesFilter(w, "needs_review");
    const notVoiceable = matchesFilter(w, "not_voiceable");
    const failed = notVoiceable || matchesFilter(w, "failed");
    const state: ItemState = waits ? "todo" : failed ? "failed" : "approved";
    const title = w.word?.arabic ?? w.forms[0]?.vowelisedText ?? w.wordId;
    const splits = w.forms.filter((f) => f.reviewStatus === "needs_review").length;
    const takes = w.forms.reduce((n, f) => n + f.takes.filter((t) => t.current && t.status === "needs_review").length, 0);
    const parts = [
      splits ? `${splits} ${splits === 1 ? "split" : "splits"} to review` : "",
      takes ? `${takes} ${takes === 1 ? "take" : "takes"} to hear` : "",
      failed ? (notVoiceable ? "not voiceable" : "a take failed") : "",
    ].filter(Boolean);
    return {
      key: `blend:${w.wordId}`,
      kind: "blend",
      id: w.wordId,
      title,
      titleScript: "ar",
      state,
      failedLabel: notVoiceable ? "Not voiceable" : "Failed",
      context: parts.join(" · ") || "Reviewed",
      usage: w.word?.usageCount ?? 0,
      waitingSince: null,
      searchText: w.word?.english ?? "",
      bulkSafe: false,
      familyId: null,
      data: w,
    };
  });
}

// ---- AI drafts (per node today; BE-1 lists them across nodes) -------------------------

export type DraftItem = InboxItem<"draft", DraftRow>;

const typeLabel = (type: string) => GENERATION_TYPES.find((t) => t.value === type)?.label ?? type;

/** `nodeTitles` names a node in the row's context line when known. */
export function draftItems(rows: readonly DraftRow[], nodeTitles: ReadonlyMap<string, string> = new Map()): DraftItem[] {
  return rows.map((d) => {
    const status = draftStatus(d);
    const state: ItemState = status === "pending" ? "todo" : status === "rejected" ? "rejected" : "approved";
    const node = nodeTitles.get(d.node_id) ?? d.node_id;
    const rejected = d.provenance?.review?.reason;
    return {
      key: `draft:${d.id}`,
      kind: "draft",
      id: d.id,
      title: typeLabel(d.type),
      titleScript: "latin",
      state,
      context: status === "rejected" && rejected ? `${node} · ${rejected}` : node,
      usage: 0,
      waitingSince: d.provenance?.created_at ?? d.created_at,
      decidedAt: d.approved_at ?? d.provenance?.review?.at ?? null,
      decidedBy: d.approved_by ?? d.provenance?.review?.by ?? null,
      searchText: `${d.type} ${node} ${d.node_id}`,
      bulkSafe: false,
      familyId: null,
      data: d,
    };
  });
}

// ---- word requests (GET /curriculum/generation/word-requests) ------------------------

export type RequestItem = InboxItem<"request", WordRequest>;

export function requestItems(rows: readonly WordRequest[], nodeTitles: ReadonlyMap<string, string> = new Map()): RequestItem[] {
  return rows.map((r) => {
    const state: ItemState = r.status === "open" ? "todo" : r.status === "fulfilled" ? "approved" : "rejected";
    const node = nodeTitles.get(r.node_id) ?? r.node_id;
    return {
      key: `request:${r.id}`,
      kind: "request",
      id: r.id,
      title: r.description_en,
      titleScript: "latin",
      state,
      context: `${r.activity_type} · ${node}`,
      usage: 0,
      waitingSince: r.created_at,
      searchText: `${r.activity_type} ${node} ${r.node_id}`,
      bulkSafe: false,
      familyId: null,
      data: r,
    };
  });
}

// ---- phrases (GET /curriculum/reading/phrases) ----------------------------------------

export type PhraseItem = InboxItem<"phrase", PhraseEntry>;

function phraseItem(p: PhraseEntry, approved: boolean): PhraseItem {
  const kindWord = p.is_sentence ? "Sentence" : "Phrase";
  const problems = p.word_problems.length;
  return {
    key: `phrase:${p.phrase_key}`,
    kind: "phrase",
    id: p.phrase_key,
    title: p.text ?? p.phrase_key,
    titleScript: p.text ? "ar" : "latin",
    state: approved ? "approved" : "todo",
    todoLabel: p.reason === "flag_mismatch" ? "Confirm again" : undefined,
    context: [
      kindWord,
      problems
        ? `${problems} word ${problems === 1 ? "problem" : "problems"}`
        : `${p.used_in.length} ${p.used_in.length === 1 ? "use" : "uses"}`,
      approved ? "" : reasonText(p.reason),
    ]
      .filter(Boolean)
      .join(" · "),
    usage: p.used_in.length,
    waitingSince: null,
    decidedAt: p.approval?.reviewed_at ?? null,
    decidedBy: p.approval?.reviewed_by ?? null,
    searchText: p.used_in.map((u) => `${u.type} ${u.node_id}`).join(" "),
    bulkSafe: false,
    familyId: null,
    data: p,
  };
}

export function phraseItems(list: PhraseList): PhraseItem[] {
  return [...list.pending.map((p) => phraseItem(p, false)), ...list.approved.map((p) => phraseItem(p, true))];
}

// ---- recordings (per phrase today; BE-2 summarises them on the phrase list) -----------

export type RecordingItem = InboxItem<"recording", PhraseAudioStatus>;

/** One item per approved phrase that has takes; phrases with no take yet are not a decision. */
export function recordingItems(statuses: readonly PhraseAudioStatus[]): RecordingItem[] {
  const out: RecordingItem[] = [];
  for (const s of statuses) {
    if (!s.phrase_approved || s.takes.length === 0) continue;
    const toHear = takeToReview(s);
    const latest = s.takes.find((t) => t.current) ?? s.takes[0];
    const served = s.takes.some((t) => t.served);
    const state: ItemState = toHear ? "todo" : latest?.status === "failed" ? "failed" : served ? "approved" : "rejected";
    out.push({
      key: `recording:${s.phrase_key}`,
      kind: "recording",
      id: s.phrase_key,
      title: s.text ?? s.phrase_key,
      titleScript: s.text ? "ar" : "latin",
      state,
      context: [
        s.is_sentence ? "Sentence" : "Phrase",
        toHear ? (served ? "new take beside the served one" : "first take") : state === "failed" ? "last take failed" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      usage: 0,
      waitingSince: toHear?.created_at ?? null,
      searchText: "",
      bulkSafe: false,
      familyId: null,
      data: s,
    });
  }
  return out;
}
