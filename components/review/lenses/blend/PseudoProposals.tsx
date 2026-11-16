"use client";

import * as React from "react";
import type { PseudoProposal } from "@/lib/blendWord/review";

/**
 * "Proposed: mark as a practice word". No route sets `is_pseudo`, so this only
 * points to the activity word editor (design section 3, open question 4).
 */
export function PseudoProposals({ proposals }: { proposals: PseudoProposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-400/50 bg-amber-50/50 p-2 text-sm dark:bg-amber-500/10">
      <p className="font-medium">Proposed: mark as a practice word</p>
      <ul className="text-xs">
        {proposals.map((p, i) => (
          <li key={i}>
            {p.source}: {p.message}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">
        To mark it, tick &quot;Practice word&quot; in the word editor of an activity that uses it.
      </p>
    </div>
  );
}
