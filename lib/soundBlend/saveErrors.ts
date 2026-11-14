/**
 * The server's refusal of a sound_blend save (SB-B3): a 400 with code
 * `BLEND_INVALID` and details `[{ form, issues }]`, or field errors
 * `[{ field, message }]`. Parsed here so the form shows them inline with the
 * same plain-word messages as the live preview.
 */

import type { BlendEnding } from "./config";
import type { IssueLike } from "./preview";

export const BLEND_INVALID = "BLEND_INVALID";

export interface BlendSaveErrors {
  byForm: Partial<Record<BlendEnding, IssueLike[]>>;
  /** Errors not about one form's split (a field, the word reference). */
  general: string[];
}

function isIssue(v: unknown): v is IssueLike {
  return !!v && typeof v === "object" && typeof (v as IssueLike).code === "string" &&
    typeof (v as IssueLike).message === "string";
}

/** The parts of a BLEND_INVALID error; null when the error is something else. */
export function parseBlendSaveError(error: { code?: string; details?: unknown } | null | undefined): BlendSaveErrors | null {
  if (!error || error.code !== BLEND_INVALID) return null;
  const out: BlendSaveErrors = { byForm: {}, general: [] };
  const details = Array.isArray(error.details) ? error.details : [];
  for (const d of details) {
    if (!d || typeof d !== "object") continue;
    const entry = d as { form?: unknown; issues?: unknown; field?: unknown; message?: unknown };
    if ((entry.form === "pausal" || entry.form === "full") && Array.isArray(entry.issues)) {
      const issues = entry.issues.filter(isIssue);
      out.byForm[entry.form] = [...(out.byForm[entry.form] ?? []), ...issues];
    } else if (typeof entry.message === "string") {
      out.general.push(typeof entry.field === "string" ? `${entry.field}: ${entry.message}` : entry.message);
    }
  }
  if (details.length === 0) out.general.push("The server refused the word.");
  return out;
}
