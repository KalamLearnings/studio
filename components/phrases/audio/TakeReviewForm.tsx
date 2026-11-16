"use client";

/** The take review part: why a take is rejected (one of eight reasons), and a note. Controlled. */

import type * as React from "react";
import { PHRASE_REJECT_LABELS, PHRASE_REJECT_REASONS, type PhraseRejectReason } from "@/lib/phrases/phraseAudio";
import { ReasonPicker } from "../ReasonPicker";

export const TAKE_REASONS = PHRASE_REJECT_REASONS.map((value) => ({ value, label: PHRASE_REJECT_LABELS[value] }));

export interface TakeReviewDraft {
  reason: PhraseRejectReason | null;
  note: string;
  error: string | null;
}

export const EMPTY_TAKE_REVIEW: TakeReviewDraft = { reason: null, note: "", error: null };

export function TakeReviewForm({
  draft,
  onChange,
  numbered,
  noteRef,
}: {
  draft: TakeReviewDraft;
  onChange: (d: TakeReviewDraft) => void;
  numbered?: boolean;
  noteRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <ReasonPicker
      label="Why the take is rejected"
      reasons={TAKE_REASONS}
      value={draft.reason}
      onChange={(reason) => onChange({ ...draft, reason, error: null })}
      note={draft.note}
      onNote={(note) => onChange({ ...draft, note, error: null })}
      noteNeeded={draft.reason === "other"}
      error={draft.error}
      numbered={numbered}
      noteRef={noteRef}
    />
  );
}
