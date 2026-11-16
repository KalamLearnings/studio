/** The lenses of CW-7 (AI drafts, word requests) and CW-8 (phrases, recordings), registered in `./index.ts`. */

import { DraftPane } from "./draft/DraftPane";
import { DraftTools } from "./draft/DraftTools";
import { PhrasePane } from "./phrase/PhrasePane";
import { RecordingPane } from "./recording/RecordingPane";
import { RequestPane } from "./request/RequestPane";
import type { LensDefinition } from "./types";

const REJECT = { label: "Reject, decline (opens the reasons)", keys: ["r"] };
const PICK_REASON = { label: "Pick a reason or a word", keys: ["1", "to", "9"] };

export const DRAFT_PHRASE_LENSES: LensDefinition[] = [
  {
    kind: "draft",
    Pane: DraftPane,
    ListTools: DraftTools,
    shortcuts: [
      { title: "Decide", rows: [REJECT] },
      { title: "Context", rows: [{ label: "Open the draft in the builder", keys: ["o"] }] },
    ],
  },
  {
    kind: "request",
    Pane: RequestPane,
    shortcuts: [{ title: "Decide", rows: [{ label: "Fulfil a word request (opens the picker)", keys: ["a"] }, REJECT, PICK_REASON] }],
  },
  { kind: "phrase", Pane: PhrasePane, shortcuts: [{ title: "Decide", rows: [REJECT, PICK_REASON] }] },
  {
    kind: "recording",
    Pane: RecordingPane,
    shortcuts: [
      {
        title: "Listen",
        rows: [
          { label: "Play or stop the take to decide", keys: ["space"] },
          { label: "Play the served take, to compare", keys: ["shift", "space"] },
          { label: "Make a new take", keys: ["g"] },
        ],
      },
      { title: "Decide", rows: [REJECT, PICK_REASON] },
    ],
  },
];
