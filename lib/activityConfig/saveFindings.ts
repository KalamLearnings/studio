/**
 * The server's logged save findings of an activity (backend CM-S13r): the
 * checks a save failed in shadow mode, which never refused the save. Read
 * from `GET /curriculum/reading/activities/:id/save-findings` and shown as
 * warnings beside the fields they are about, in the same display as a
 * refused save's errors (`./saveErrors`). Pure.
 */

import type { ConfigFieldError } from "./saveErrors";

export interface SaveFindingEntry {
  check: string;
  stage?: string;
  severity?: string;
  /** `config.<path>`, or `config` for the whole config. */
  field: string;
  message: string;
  logged_at?: string;
}

export interface ActivitySaveFindings {
  activity_id: string;
  type?: string;
  config_hash?: string;
  findings: SaveFindingEntry[];
}

/** The findings as field errors (path without the `config.` prefix); anything malformed is skipped. */
export function findingsToFieldErrors(
  result: { findings?: unknown } | null | undefined,
): ConfigFieldError[] {
  const list = Array.isArray(result?.findings) ? result.findings : [];
  const out: ConfigFieldError[] = [];
  for (const f of list) {
    if (!f || typeof f !== "object") continue;
    const entry = f as { field?: unknown; message?: unknown; check?: unknown };
    if (typeof entry.message !== "string") continue;
    const field = typeof entry.field === "string" ? entry.field : "config";
    out.push({
      path: field === "config" ? "" : field.replace(/^config\./, ""),
      message: entry.message,
      ...(typeof entry.check === "string" && { check: entry.check }),
    });
  }
  return out;
}
