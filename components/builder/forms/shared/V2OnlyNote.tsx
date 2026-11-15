"use client";

import * as React from "react";
import { Info } from "lucide-react";

/**
 * The note on a v2-only activity type's form (backend CM-B35, `visibility.ts`
 * `V2_ONLY_ACTIVITY_TYPES`): the server never sends the activity to the v1
 * app.
 */
export function V2OnlyNote() {
  return (
    <p className="flex gap-2 rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        New app (v2) only. Children on the v1 app never see this activity.
      </span>
    </p>
  );
}
