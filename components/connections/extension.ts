/**
 * Extension points for CG-5: a "+ Add" button on each box, a picker typed to
 * what the box takes (`box.accepts`), refusals in plain words, and Undo. No
 * drag and drop. The page is read only in CG-1 to CG-6: nothing provides
 * these yet, so the page renders no edit controls. See `README.md`.
 */

import * as React from "react";
import type { NodeKey } from "@/lib/connections/keys";
import type { Box, BoxItem } from "@/lib/connections/neighbourhood";

export interface ConnectionsEditing {
  /** Next to a box's heading: "+ Add". Render it only when `box.accepts` is set (boxes made by hand). */
  headerExtra?: (box: Box, focus: NodeKey) => React.ReactNode;
  /** On each chip of an editable box: remove, "make dictionary form". */
  itemExtra?: (box: Box, item: BoxItem, focus: NodeKey) => React.ReactNode;
  /** In an empty box: "Start a family". */
  emptyExtra?: (box: Box, focus: NodeKey) => React.ReactNode;
}

/**
 * Provided by CG-5 only when `connectAccess(user).canConnect` (owner
 * decision 3). Null: read only.
 */
export const EditingContext = React.createContext<ConnectionsEditing | null>(null);

export const useEditing = () => React.useContext(EditingContext);
