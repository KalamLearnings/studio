/**
 * Who may make connections on the Words page (owner decision 3, 2026-11-16):
 * a curriculum lead or a phrase reviewer. Everyone else sees the page read
 * only, with the reason. The server decides; this only shapes the page. Pure.
 */

import { isPhraseReviewer } from "../phrases/phraseReview";
import { READ_ONLY_REASON } from "./kinds";

export interface ConnectAccess {
  canConnect: boolean;
  /** Shown when `canConnect` is false. */
  reason: string | null;
}

export function connectAccess(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): ConnectAccess {
  // `isPhraseReviewer` already counts a curriculum lead as one.
  const canConnect = isPhraseReviewer(user);
  return { canConnect, reason: canConnect ? null : READ_ONLY_REASON };
}
