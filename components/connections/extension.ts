/**
 * Extension points of the frame, filled by CG-5 (`editing/ConnectEditing.tsx`):
 * "+ Add" on each box made by hand, a picker typed to what the box takes
 * (`box.accepts`), refusals in plain words, remove and "make dictionary form"
 * on chips, "Start a family", "Mark as practice word", the split of one
 * spelling's meanings, and Undo. No drag and drop. Nothing provides these
 * while the page is read only, so it renders no edit controls.
 */

import * as React from "react";
import type { NodeKey } from "@/lib/connections/keys";
import type { MeaningGroup, SeveralMeanings } from "@/lib/connections/meanings";
import type { Box, BoxItem } from "@/lib/connections/neighbourhood";

export interface ConnectionsEditing {
  /** Next to a box's heading: "+ Add". Rendered only when `box.accepts` is set (boxes made by hand). */
  headerExtra?: (box: Box, focus: NodeKey) => React.ReactNode;
  /** On each chip of an editable box: remove, "make dictionary form". */
  itemExtra?: (box: Box, item: BoxItem, focus: NodeKey) => React.ReactNode;
  /** In an empty box: "Start a family". */
  emptyExtra?: (box: Box, focus: NodeKey) => React.ReactNode;
  /** Under the item in the middle: "Mark as practice word". */
  focusExtra?: (focus: NodeKey) => React.ReactNode;
  /** On one meaning of the several-meanings note: "Give it its own family". */
  splitExtra?: (m: SeveralMeanings, group: MeaningGroup, focus: NodeKey) => React.ReactNode;
}

/**
 * Provided only when `connectAccess(user).canConnect` (owner decision 3).
 * Null: read only.
 */
export const EditingContext = React.createContext<ConnectionsEditing | null>(null);

export const useEditing = () => React.useContext(EditingContext);
