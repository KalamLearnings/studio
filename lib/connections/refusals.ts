/**
 * A refused connection in plain words (CG-5, Review's Suggested links): the
 * backend's code through `familyErrorText` (`lib/words/family.ts`, where the
 * map lives), and a note when a refused plan could not be fully undone. Pure.
 */

import { familyErrorText } from "../words/family";
import { CONNECT_ROLE_TEXT } from "./kinds";
import { OpsError, refusalOf } from "./ops";

export function connectErrorText(e: unknown, fallback = "The change was not saved."): string {
  const err = refusalOf(e) as { code?: unknown; status?: unknown; message?: unknown } | null;
  const code = err && typeof err.code === "string" ? err.code : undefined;
  const status = err && typeof err.status === "number" ? err.status : undefined;
  const message = err && typeof err.message === "string" && err.message ? err.message : fallback;
  const text = status === 403 && !code ? CONNECT_ROLE_TEXT : familyErrorText(code, message);
  if (e instanceof OpsError && !e.rolledBack) return `${text} Part of the change was made and could not be undone; reload to see where it stands.`;
  return text;
}
