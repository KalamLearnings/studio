/**
 * The server's logged save findings of an activity (backend CM-S13r): the
 * checks a save failed in shadow mode, which never refused the save. Read
 * from `GET /curriculum/reading/activities/:id/save-findings` and shown
 * beside the fields they are about, in the same display as a refused save's
 * errors (`./saveErrors`): a finding of severity `warning` as a warning, one
 * of severity `info` (decodability, backend CM-C11a; ADR 0002 question 6) as
 * a calm note. Pure.
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

/**
 * Checks whose findings are informational notes even from a server that
 * still labels them `warning` (a backend from before CM-C11a). The server's
 * `severity: 'info'` is the rule; this only covers the deploy gap.
 */
const NOTE_CHECKS: readonly string[] = ["decodable"];

/** Whether a logged finding is a note (`info`) rather than a warning. */
export function isNoteFinding(entry: { severity?: unknown; check?: unknown }): boolean {
  return entry.severity === "info" || (typeof entry.check === "string" && NOTE_CHECKS.includes(entry.check));
}

/**
 * The findings as field errors (path without the `config.` prefix); anything
 * malformed is skipped. `kind` picks the warnings (default) or the notes.
 */
export function findingsToFieldErrors(
  result: { findings?: unknown } | null | undefined,
  kind: "warning" | "note" = "warning",
): ConfigFieldError[] {
  const list = Array.isArray(result?.findings) ? result.findings : [];
  const out: ConfigFieldError[] = [];
  for (const f of list) {
    if (!f || typeof f !== "object") continue;
    const entry = f as { field?: unknown; message?: unknown; check?: unknown; severity?: unknown };
    if (typeof entry.message !== "string") continue;
    if (isNoteFinding(entry) !== (kind === "note")) continue;
    const field = typeof entry.field === "string" ? entry.field : "config";
    out.push({
      path: field === "config" ? "" : field.replace(/^config\./, ""),
      message: entry.message,
      ...(typeof entry.check === "string" && { check: entry.check }),
    });
  }
  return out;
}
