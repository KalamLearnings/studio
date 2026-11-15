"use client";

import { cn } from "@/lib/utils";
import { isNotReviewed } from "@/lib/words/family";
import type { CuratedWord } from "@/lib/types/wordFamilies";

/**
 * "Not reviewed": a live, real spelling nobody has approved yet (CM-S5).
 * Shows nothing for a reviewed, retired or drill spelling. Reusable on any
 * screen that lists spellings (the review queue, CM-S7, owns the writes).
 */
export function NotReviewedBadge({
  word,
  className,
}: {
  word: Pick<CuratedWord, "reviewed_at" | "retired_at" | "is_pseudo">;
  className?: string;
}) {
  if (!isNotReviewed(word)) return null;
  return (
    <span className={cn("rounded-full bg-amber-100 px-2 py-0.5 text-xs whitespace-nowrap text-amber-800", className)}>
      Not reviewed
    </span>
  );
}
