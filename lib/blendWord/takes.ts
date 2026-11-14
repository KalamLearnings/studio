/**
 * The audio takes of a blend word (SB-S3, TECH-DESIGN 2.6, 3.2): their status
 * in plain words, the settings a regeneration is made with, and the
 * endpoints' refusals.
 *
 * The shapes mirror the backend's review read (`BlendReviewTake` in
 * core/application/words/list-blend-review.ts) and its write contracts
 * (core/contracts/blend-review.ts). Pure: no React, no fetch.
 */

import type { BlendEnding } from "./config";

// ---------------------------------------------------------------------------
// Shapes (the backend's)
// ---------------------------------------------------------------------------

export type TakeKind = "natural" | "stretched";
export const TAKE_KINDS: readonly TakeKind[] = ["natural", "stretched"];

export type TakeStatus = "pending" | "needs_review" | "ready" | "rejected" | "failed" | "not_voiceable";

export type PhaseKind = "hold" | "madd" | "closure" | "short" | "release";

export interface PhaseMark {
  unit: number;
  kind: PhaseKind;
  startMs: number;
  endMs: number;
}

export type QaCheck = "structure" | "alignment_off" | "gap" | "added_schwa" | "duration" | "stretch_length";

/** A take's automatic-check flag. */
export interface TakeQaFlag {
  check: QaCheck;
  unit?: number;
  message: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
}

/** What a reviewer asks a regenerated natural take to be made with. */
export interface TakeRequest {
  voiceId?: string;
  voiceSettings?: Partial<VoiceSettings>;
  seed?: number;
  textHints?: { languageCode?: "ar" };
}

export type TakeSettings =
  | {
      kind: "natural";
      text: string;
      voiceId: string;
      seed: number;
      voiceSettings: VoiceSettings;
      languageCode?: string;
      outputFormat: string;
      refineWindowMs: number;
      speech: { startMs: number; endMs: number };
    }
  | { kind: "stretched"; fromTakeId: string; targetsMs: number[] };

export interface BlendReviewTake {
  id: string;
  kind: TakeKind;
  source: "generated" | "derived";
  status: TakeStatus;
  /** The take belongs to the split stored now; an older split's take is history. */
  current: boolean;
  url: string | null;
  durationMs: number | null;
  marks: number[] | null;
  phases: PhaseMark[] | null;
  qaFlags: TakeQaFlag[];
  /** Why it was rejected, failed or superseded. */
  error: string | null;
  attempts: number;
  voiceId: string | null;
  settings: TakeSettings | null;
  request: TakeRequest | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** The reasons a reviewer may give for rejecting a take (the backend's `TAKE_REJECT_REASONS`). */
export const TAKE_REJECT_REASONS = [
  "wrong_vowel",
  "short_vowel_too_long",
  "madd_too_short",
  "qalqala",
  "added_vowel",
  "wrong_word",
  "unclear_consonant",
  "sun_lam_voiced",
  "seat_alif_voiced",
  "noise",
  "other",
] as const;
export type TakeRejectReason = (typeof TAKE_REJECT_REASONS)[number];

export const REJECT_REASON_LABELS: Record<TakeRejectReason, string> = {
  wrong_vowel: "Wrong vowel",
  short_vowel_too_long: "Short vowel too long",
  madd_too_short: "Madd too short",
  qalqala: "Missing or wrong qalqala",
  added_vowel: "Added vowel",
  wrong_word: "Wrong word",
  unclear_consonant: "Unclear consonant",
  sun_lam_voiced: "Sun lam voiced",
  seat_alif_voiced: "Seat alif voiced",
  noise: "Noise",
  other: "Other (say why in the note)",
};

/** A failed take is retried this many times before it is not voiceable (the backend's `MAX_TAKE_ATTEMPTS`). */
export const MAX_TAKE_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type ChipTone = "neutral" | "info" | "warning" | "success" | "danger";

export interface StatusChip {
  kind: TakeKind;
  /** "Natural", "Stretched". */
  kindLabel: string;
  /** Null: no take of this kind yet. */
  status: TakeStatus | null;
  label: string;
  tone: ChipTone;
  /** The failure or rejection reason in plain words. */
  detail: string | null;
}

export const KIND_LABELS: Record<TakeKind, string> = { natural: "Natural", stretched: "Stretched" };

export const STATUS_LABELS: Record<TakeStatus, string> = {
  pending: "Pending",
  needs_review: "Needs review",
  ready: "Ready",
  rejected: "Rejected",
  failed: "Failed",
  not_voiceable: "Not voiceable",
};

export const STATUS_TONES: Record<TakeStatus, ChipTone> = {
  pending: "info",
  needs_review: "warning",
  ready: "success",
  rejected: "neutral",
  failed: "danger",
  not_voiceable: "danger",
};

const KNOWN_ERRORS: { test: RegExp; text: string }[] = [
  { test: /spend_disabled|SPEND_DISABLED/, text: "Audio generation was turned off." },
  { test: /spend_budget_exceeded|SPEND_BUDGET_EXCEEDED|budget/i, text: "This month's audio budget was used up." },
  { test: /alignment_text_mismatch/, text: "The voice said a different word." },
  { test: /rate.?limit|429/i, text: "The voice service was busy." },
];

/**
 * A take's `error` in plain words. Reviewer rejections are stored as
 * `rejected (<reason>): <note>`; the reason gets its label.
 */
export function takeErrorText(error: string | null | undefined): string | null {
  const raw = error?.trim();
  if (!raw) return null;
  const rejected = /^rejected \(([a-z_]+)\)(?::\s*([\s\S]*))?$/.exec(raw);
  if (rejected) {
    const label = REJECT_REASON_LABELS[rejected[1] as TakeRejectReason] ?? rejected[1].replace(/_/g, " ");
    return rejected[2] ? `Rejected: ${label}. ${rejected[2]}` : `Rejected: ${label}.`;
  }
  const known = KNOWN_ERRORS.find((k) => k.test.test(raw));
  return known ? known.text : raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** The newest take of a kind that belongs to the current split (takes come newest first). */
export function latestTake(takes: readonly BlendReviewTake[], kind: TakeKind): BlendReviewTake | null {
  return takes.find((t) => t.kind === kind && t.current) ?? null;
}

/** The status chips of one form: natural and stretched, from their newest current take. */
export function formStatusChips(takes: readonly BlendReviewTake[]): StatusChip[] {
  return TAKE_KINDS.map((kind) => {
    const take = latestTake(takes, kind);
    if (!take) {
      return { kind, kindLabel: KIND_LABELS[kind], status: null, label: "No take", tone: "neutral", detail: null };
    }
    const showsReason = take.status === "failed" || take.status === "not_voiceable" || take.status === "rejected";
    return {
      kind,
      kindLabel: KIND_LABELS[kind],
      status: take.status,
      label: STATUS_LABELS[take.status],
      tone: STATUS_TONES[take.status],
      detail: showsReason ? takeErrorText(take.error) : null,
    };
  });
}

/** Some take of the list is being made: the page polls. */
export function anyPending(takes: readonly BlendReviewTake[]): boolean {
  return takes.some((t) => t.status === "pending");
}

/** What a reviewer may do with a take, as the backend allows it. */
export function takeActions(take: BlendReviewTake): { approve: boolean; reject: boolean; editMarks: boolean } {
  const reviewable = take.current && take.status === "needs_review";
  const complete = !!take.url && !!take.marks && take.marks.length >= 2;
  return {
    approve: reviewable && complete,
    reject: take.current && ["needs_review", "ready", "failed", "not_voiceable"].includes(take.status),
    editMarks: reviewable && complete && !!take.phases,
  };
}

// ---------------------------------------------------------------------------
// Regenerate settings
// ---------------------------------------------------------------------------

/** The settings fields as the reviewer edits them (text inputs). */
export interface TakeSettingsDraft {
  /** Empty: the backend's default Arabic voice. */
  voiceId: string;
  seed: string;
  stability: string;
  similarityBoost: string;
  style: string;
  /** Send `language_code: 'ar'`. */
  arabicLanguageCode: boolean;
}

export const EMPTY_SETTINGS_DRAFT: TakeSettingsDraft = {
  voiceId: "",
  seed: "",
  stability: "",
  similarityBoost: "",
  style: "",
  arabicLanguageCode: false,
};

const fmt = (n: number | undefined) => (typeof n === "number" && Number.isFinite(n) ? String(n) : "");
const clamp01 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;

/** The settings a take was made with, as a draft to edit; empty for a stretched take or none. */
export function draftFromTake(take: BlendReviewTake | null | undefined): TakeSettingsDraft {
  const s = take?.settings;
  if (!s || s.kind !== "natural") return { ...EMPTY_SETTINGS_DRAFT };
  return {
    voiceId: s.voiceId ?? "",
    seed: fmt(s.seed),
    stability: fmt(s.voiceSettings?.stability),
    similarityBoost: fmt(s.voiceSettings?.similarity_boost),
    style: fmt(s.voiceSettings?.style),
    arabicLanguageCode: s.languageCode === "ar",
  };
}

/**
 * The proposed settings for the next take after a rejection (TECH-DESIGN 2.6,
 * "On reject, regenerate"): always a new seed; steadier delivery for length
 * and clarity problems; the Arabic language code when the voice read the
 * wrong word. The reviewer may edit them before sending.
 */
export function proposeRegenerate(take: BlendReviewTake | null | undefined, reason: TakeRejectReason): TakeSettingsDraft {
  const draft = draftFromTake(take);
  const seed = Number(draft.seed);
  draft.seed = String(Number.isInteger(seed) && seed >= 0 ? seed + 1 : 1);
  const stability = draft.stability === "" ? null : Number(draft.stability);
  if (["short_vowel_too_long", "madd_too_short", "unclear_consonant", "added_vowel"].includes(reason)) {
    draft.stability = String(clamp01((stability ?? 0.5) + 0.15));
  }
  if (reason === "wrong_word" || reason === "wrong_vowel") draft.arabicLanguageCode = true;
  if (draft.style !== "") draft.style = "0";
  return draft;
}

export type SettingsDraftResult = { ok: true; request: TakeRequest } | { ok: false; errors: Partial<Record<keyof TakeSettingsDraft, string>> };

/**
 * The draft as the backend's `TakeRequest`, or the field errors in plain
 * words. Blank fields are left out (the backend's default applies).
 */
export function settingsFromDraft(draft: TakeSettingsDraft): SettingsDraftResult {
  const errors: Partial<Record<keyof TakeSettingsDraft, string>> = {};
  const request: TakeRequest = {};

  const voiceId = draft.voiceId.trim();
  if (voiceId.length > 64) errors.voiceId = "The voice id is too long.";
  else if (voiceId) request.voiceId = voiceId;

  const seedText = draft.seed.trim();
  if (seedText) {
    const seed = Number(seedText);
    if (!Number.isInteger(seed) || seed < 0 || seed > 2_000_000_000) {
      errors.seed = "The seed must be a whole number from 0 to 2,000,000,000.";
    } else request.seed = seed;
  }

  const unit = (key: "stability" | "similarityBoost" | "style", name: keyof VoiceSettings, label: string) => {
    const text = draft[key].trim();
    if (!text) return;
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      errors[key] = `${label} must be a number from 0 to 1.`;
      return;
    }
    request.voiceSettings = { ...request.voiceSettings, [name]: n };
  };
  unit("stability", "stability", "Stability");
  unit("similarityBoost", "similarity_boost", "Similarity");
  unit("style", "style", "Style");

  if (draft.arabicLanguageCode) request.textHints = { languageCode: "ar" };

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, request };
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export interface GenerateAudioInput {
  form: BlendEnding;
  regenerate?: boolean;
  kinds?: TakeKind[];
  settings?: TakeRequest;
}

export type TakeReviewBody =
  | { decision: "approve" }
  | { decision: "reject"; reason: TakeRejectReason; note?: string; regenerate?: TakeRequest };

export type TakeRejectResult = { ok: true; body: TakeReviewBody } | { ok: false; error: string };

/** The reject body, checked as the backend checks it: `other` needs a note; a note is at most 500 characters. */
export function takeRejectBody(reason: TakeRejectReason | "", note: string, regenerate: TakeRequest | null): TakeRejectResult {
  if (!reason) return { ok: false, error: "Pick a reason." };
  const n = note.trim();
  if (n.length > 500) return { ok: false, error: "The note may be at most 500 characters." };
  if (reason === "other" && !n) return { ok: false, error: "Say why in the note when the reason is Other." };
  return {
    ok: true,
    body: {
      decision: "reject",
      reason,
      ...(n ? { note: n } : {}),
      ...(regenerate ? { regenerate } : {}),
    },
  };
}

/** The Generate body: Regenerate makes new takes and rejects the open ones. Blank settings send none. */
export function generateBody(form: BlendEnding, regenerate: boolean, settings: TakeRequest | null): GenerateAudioInput {
  return {
    form,
    regenerate,
    ...(settings && Object.keys(settings).length > 0 ? { settings } : {}),
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const AUDIO_OFF_MESSAGE = "Audio generation is turned off";

export interface AudioErrorView {
  message: string;
  /** Disable Generate, Regenerate and reject-and-regenerate with this message as the reason. */
  disableGeneration: boolean;
}

/** An audio endpoint's refusal in plain words. */
export function audioErrorView(error: unknown): AudioErrorView {
  const e = (error ?? {}) as { code?: string; status?: number; message?: string };
  switch (e.code) {
    case "SPEND_DISABLED":
      return { message: `${AUDIO_OFF_MESSAGE}.`, disableGeneration: true };
    case "SPEND_BUDGET_EXCEEDED":
      return { message: "This month's audio budget is used up.", disableGeneration: true };
    case "PROVIDER_RATE_LIMITED":
      return { message: "The voice service is busy. Wait a moment and try again.", disableGeneration: false };
    case "TAKE_STALE":
      return { message: "This take is of an older split of the word. Reload the list.", disableGeneration: false };
    case "TAKE_NOT_REVIEWABLE":
      return { message: "This take cannot be changed in its status. Reload the list.", disableGeneration: false };
    case "TAKE_INCOMPLETE":
      return { message: "This take has no audio or marks yet.", disableGeneration: false };
    case "TAKE_NOT_FOUND":
      return { message: "This take no longer exists. Reload the list.", disableGeneration: false };
    case "BLEND_NOT_FOUND":
      return { message: "The word has no saved split for this form. Save the activity first.", disableGeneration: false };
    case "TAKE_MARKS_INVALID":
      return { message: "The marks do not pass the checks.", disableGeneration: false };
  }
  if (e.status === 503) return { message: `${AUDIO_OFF_MESSAGE}.`, disableGeneration: true };
  if (e.status === 403) return { message: "Only staff can review or generate audio.", disableGeneration: false };
  if (e.status === 401 || e.message === "NOT_AUTHENTICATED_FOR_ENV") {
    return { message: "You are signed out. Sign in again.", disableGeneration: false };
  }
  if (e.status === 400) {
    return { message: e.message ? `The request was refused: ${e.message}` : "The request was refused.", disableGeneration: false };
  }
  return { message: "Something went wrong. Try again.", disableGeneration: false };
}
