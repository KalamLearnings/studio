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
import { reasonText, rejectionReasonText, type PhraseEntry, type PhraseList } from "../../phrases/phraseReview";
import type { InboxItem, ItemState } from "../inbox";
import { blendTargets } from "./blend";

// ---- blend (GET /words/blend/review) ------------------------------------------------

export type BlendItem = InboxItem<"blend", BlendReviewWord>;

export function blendItems(words: readonly BlendReviewWord[]): BlendItem[] {
  return words.map((w) => {
    // A split rejected by its current review waits for the author, not for a reviewer.
    const targets = blendTargets(w);
    const notVoiceable = matchesFilter(w, "not_voiceable");
    const failed = notVoiceable || matchesFilter(w, "failed");
    const rejected = w.forms.some((f) => f.review?.current && f.review.decision === "rejected");
    const state: ItemState = targets.length ? "todo" : failed ? "failed" : rejected ? "rejected" : "approved";
    const title = w.word?.arabic ?? w.forms[0]?.vowelisedText ?? w.wordId;
    const splits = targets.filter((t) => t.type === "split").length;
    const takes = targets.length - splits;
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

/**
 * A draft of `GET /curriculum/generation/drafts` (BE-1, `{ items, next_cursor }`): the
 * per-node draft row plus where it lives. The per-node route has none of these fields.
 */
export interface InboxDraftRow extends DraftRow {
  /** BE-1 sends the stored localized title (`{ en, ar? }`); a plain string is read too. */
  node_title?: StoredTitle;
  topic_id?: string | null;
  topic_title?: StoredTitle;
  curriculum_id?: string | null;
  curriculum_title?: StoredTitle;
}

/** A title as the backend stores it: `{ en, ar? }`, or null when the row is missing. */
export type StoredTitle = string | { en?: unknown; ar?: unknown } | null;

/** The English of a stored title (the Arabic when there is no English), or null. */
export function titleText(t: StoredTitle | undefined): string | null {
  if (typeof t === "string") return t.trim() || null;
  if (!t || typeof t !== "object") return null;
  for (const v of [t.en, t.ar]) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export type DraftItem = InboxItem<"draft", InboxDraftRow>;

const typeLabel = (type: string) => GENERATION_TYPES.find((t) => t.value === type)?.label ?? type;

/** The node is named by the row's `node_title` (BE-1), else by `nodeTitles`, else by its id. */
export function draftItems(rows: readonly InboxDraftRow[], nodeTitles: ReadonlyMap<string, string> = new Map()): DraftItem[] {
  return rows.map((d) => {
    const status = draftStatus(d);
    const state: ItemState = status === "pending" ? "todo" : status === "rejected" ? "rejected" : "approved";
    const node = titleText(d.node_title) ?? nodeTitles.get(d.node_id) ?? d.node_id;
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
      searchText: [d.type, node, d.node_id, titleText(d.topic_title), titleText(d.curriculum_title)].filter(Boolean).join(" "),
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

/**
 * BE-5: a rejected phrase carries its rejection; every entry has the field
 * (null unless rejected). The backend names the reviewer and time
 * `reviewed_by` and `reviewed_at`; `by` and `at` are read too.
 */
export interface PhraseRejection {
  reason: string;
  note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  by?: string | null;
  at?: string | null;
}

export const rejectedBy = (r: PhraseRejection | null | undefined) => r?.reviewed_by ?? r?.by ?? null;
export const rejectedAt = (r: PhraseRejection | null | undefined) => r?.reviewed_at ?? r?.at ?? null;

/** BE-2: the audio summary on an approved entry. */
export interface PhraseAudioSummary {
  state: "none" | "in_progress" | "needs_review" | "served" | "failed";
  needs_review_take_id?: string | null;
  served_take_id?: string | null;
}

export interface InboxPhraseEntry extends PhraseEntry {
  rejection?: PhraseRejection | null;
  audio?: PhraseAudioSummary | null;
}

/** `GET /curriculum/reading/phrases` with BE-2 and BE-5: rejected and the recording switch are optional so the old answer still reads. */
export interface InboxPhraseList extends Omit<PhraseList, "pending" | "approved"> {
  pending: InboxPhraseEntry[];
  approved: InboxPhraseEntry[];
  rejected?: InboxPhraseEntry[];
  generation_enabled?: boolean;
}

export type PhraseItem = InboxItem<"phrase", InboxPhraseEntry>;

function phraseItem(p: InboxPhraseEntry, state: "todo" | "approved" | "rejected"): PhraseItem {
  const kindWord = p.is_sentence ? "Sentence" : "Phrase";
  const problems = p.word_problems.length;
  return {
    key: `phrase:${p.phrase_key}`,
    kind: "phrase",
    id: p.phrase_key,
    title: p.text ?? p.phrase_key,
    titleScript: p.text ? "ar" : "latin",
    state,
    todoLabel: p.reason === "flag_mismatch" ? "Confirm again" : undefined,
    context: [
      kindWord,
      problems
        ? `${problems} word ${problems === 1 ? "problem" : "problems"}`
        : `${p.used_in.length} ${p.used_in.length === 1 ? "use" : "uses"}`,
      state === "todo" ? reasonText(p.reason) : "",
      state === "rejected" && p.rejection ? p.rejection.note || rejectionReasonText(p.rejection.reason) : "",
    ]
      .filter(Boolean)
      .join(" · "),
    usage: p.used_in.length,
    waitingSince: null,
    decidedAt: state === "rejected" ? rejectedAt(p.rejection) : (p.approval?.reviewed_at ?? null),
    decidedBy: state === "rejected" ? rejectedBy(p.rejection) : (p.approval?.reviewed_by ?? null),
    searchText: p.used_in.map((u) => `${u.type} ${u.node_id}`).join(" "),
    bulkSafe: false,
    familyId: null,
    data: p,
  };
}

export function phraseItems(list: InboxPhraseList): PhraseItem[] {
  return [
    ...list.pending.map((p) => phraseItem(p, "todo")),
    ...list.approved.map((p) => phraseItem(p, "approved")),
    ...(list.rejected ?? []).map((p) => phraseItem(p, "rejected")),
  ];
}

// ---- recordings ---------------------------------------------------------------------

/** From the BE-2 summary on the phrase list: one item per approved phrase whose audio is not `none`. */
export type RecordingItem = InboxItem<"recording", { entry: InboxPhraseEntry; audio: PhraseAudioSummary; generationEnabled: boolean }>;

export function recordingItems(list: InboxPhraseList): RecordingItem[] {
  const out: RecordingItem[] = [];
  for (const p of list.approved) {
    const audio = p.audio;
    if (!audio || audio.state === "none") continue;
    const state: ItemState =
      audio.state === "needs_review" ? "todo" : audio.state === "failed" ? "failed" : audio.state === "served" ? "approved" : "listen";
    out.push({
      key: `recording:${p.phrase_key}`,
      kind: "recording",
      id: p.phrase_key,
      title: p.text ?? p.phrase_key,
      titleScript: p.text ? "ar" : "latin",
      state,
      todoLabel: audio.state === "in_progress" ? "Being made" : undefined,
      context: [
        p.is_sentence ? "Sentence" : "Phrase",
        audio.state === "needs_review"
          ? audio.served_take_id
            ? "new take beside the served one"
            : "first take"
          : audio.state === "failed"
            ? "last take failed"
            : audio.state === "in_progress"
              ? "a take is being made"
              : "",
      ]
        .filter(Boolean)
        .join(" · "),
      usage: p.used_in.length,
      waitingSince: null,
      searchText: "",
      bulkSafe: false,
      familyId: null,
      data: { entry: p, audio, generationEnabled: list.generation_enabled ?? true },
    });
  }
  return out;
}

/**
 * The take a Recording pane plays and decides, from the full read it makes when
 * the item opens (`GET .../:key/audio`); the summary above only names its id.
 */
export function recordingTakeToHear(status: Pick<PhraseAudioStatus, "takes">) {
  return takeToReview(status);
}
