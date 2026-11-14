/**
 * The server's refusal of a blend v2 save (SB-B3, SB-B10), for sound_blend
 * and word_split_blend: a 400 with code `BLEND_INVALID` and details
 * `[{ form, issues }]`, or field errors `[{ field, message }]`. Parsed here so
 * the form shows them inline with the same plain-word messages as the live
 * preview.
 */

import type { BlendEnding } from "./config";
import type { IssueLike } from "./preview";

export const BLEND_INVALID = "BLEND_INVALID";

export interface BlendSaveErrors {
  byForm: Partial<Record<BlendEnding, IssueLike[]>>;
  /** Errors not about one form's split (a field, the word reference), as display lines. */
  general: string[];
  /** The same errors, with their field, so a form can place one beside its control. */
  entries: { field?: string; message: string }[];
}

function isIssue(v: unknown): v is IssueLike {
  return !!v && typeof v === "object" && typeof (v as IssueLike).code === "string" &&
    typeof (v as IssueLike).message === "string";
}

/** The parts of a BLEND_INVALID error; null when the error is something else. */
export function parseBlendSaveError(error: { code?: string; details?: unknown } | null | undefined): BlendSaveErrors | null {
  if (!error || error.code !== BLEND_INVALID) return null;
  const out: BlendSaveErrors = { byForm: {}, general: [], entries: [] };
  const details = Array.isArray(error.details) ? error.details : [];
  for (const d of details) {
    if (!d || typeof d !== "object") continue;
    const entry = d as { form?: unknown; issues?: unknown; field?: unknown; message?: unknown };
    if ((entry.form === "pausal" || entry.form === "full") && Array.isArray(entry.issues)) {
      const issues = entry.issues.filter(isIssue);
      out.byForm[entry.form] = [...(out.byForm[entry.form] ?? []), ...issues];
    } else if (typeof entry.message === "string") {
      out.entries.push(typeof entry.field === "string" ? { field: entry.field, message: entry.message } : { message: entry.message });
    }
  }
  if (details.length === 0) out.entries.push({ message: "The server refused the word." });
  out.general = out.entries.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message));
  return out;
}
