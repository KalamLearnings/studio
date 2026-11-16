/**
 * The registered lenses. A kind appears in Review (rail, counts, number key,
 * shortcut sheet, and its source is read) only once its lens is listed here.
 * Later tickets add theirs: blend (CW-6), draft and request (CW-7), phrase and
 * recording (CW-8), letter (CW-11). See components/review/README.md.
 */

import { INBOX_KINDS, type InboxKind } from "@/lib/review/inbox";
import type { LensDefinition } from "./types";

const LENS_LIST: LensDefinition[] = [];

export const LENSES: ReadonlyMap<InboxKind, LensDefinition> = new Map(LENS_LIST.map((l) => [l.kind, l]));

/** The registered kinds, in rail order. */
export const REGISTERED_KINDS: readonly InboxKind[] = INBOX_KINDS.filter((k) => LENSES.has(k));
