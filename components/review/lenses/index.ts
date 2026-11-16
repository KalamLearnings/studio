/**
 * The registered lenses. A kind appears in Review (rail, counts, number key,
 * shortcut sheet, and its source is read) only once its lens is listed here.
 * Later tickets add theirs: blend (CW-6), draft and request (CW-7), phrase and
 * recording (CW-8), letter (CW-11). See components/review/README.md.
 */

import { INBOX_KINDS, type InboxKind } from "@/lib/review/inbox";
import { BlendListTools } from "./blend/BlendAiCheck";
import { BlendPane } from "./blend/BlendPane";
import { LetterPane } from "./letter/LetterPane";
import { ReadingPane } from "./reading/ReadingPane";
import { SpellingPane } from "./spelling/SpellingPane";
import type { LensDefinition } from "./types";

const CONTEXT_KEYS = {
  title: "Context",
  rows: [
    { label: "Open the family", keys: ["f"] },
    { label: "Open the concept", keys: ["c"] },
  ],
};

const LENS_LIST: LensDefinition[] = [
  {
    kind: "spelling",
    Pane: SpellingPane,
    shortcuts: [
      {
        title: "Decide",
        rows: [
          { label: "Not a real word (spelling)", keys: ["p"] },
          { label: "Wrong harakat (spelling)", keys: ["h"] },
        ],
      },
      CONTEXT_KEYS,
    ],
  },
  {
    kind: "reading",
    Pane: ReadingPane,
    shortcuts: [{ title: "Decide", rows: [{ label: "Pick a reading", keys: ["1", "to", "9"] }] }, CONTEXT_KEYS],
  },
  {
    kind: "blend",
    Pane: BlendPane,
    ListTools: BlendListTools,
    shortcuts: [
      {
        title: "Decide",
        rows: [
          { label: "Next / previous decision on this word (blend)", keys: ["tab", "shift+tab"] },
          { label: "Reject (blend: a note for a split, a reason for a take)", keys: ["r"] },
          { label: "Pick a reason", keys: ["1", "to", "9", "0"] },
        ],
      },
      { title: "Listen", rows: [{ label: "Play or stop the take", keys: ["space"] }] },
      CONTEXT_KEYS,
    ],
  },
  {
    kind: "letter",
    Pane: LetterPane,
    shortcuts: [
      {
        title: "Decide",
        rows: [
          { label: "Flag a problem (letter sound)", keys: ["r"] },
          { label: "Clear the flag (letter sound)", keys: ["a"] },
        ],
      },
      { title: "Listen", rows: [{ label: "Play or stop the file", keys: ["space"] }] },
    ],
  },
];

export const LENSES: ReadonlyMap<InboxKind, LensDefinition> = new Map(LENS_LIST.map((l) => [l.kind, l]));

/** The registered kinds, in rail order. */
export const REGISTERED_KINDS: readonly InboxKind[] = INBOX_KINDS.filter((k) => LENSES.has(k));
