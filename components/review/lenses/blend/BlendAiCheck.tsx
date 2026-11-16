"use client";

/**
 * The blend AI check (`POST /words/blend/qa/ai-check`, `useBlendAiCheck`), as
 * the old page ran it: the lens tool checks the listed words (at most 50), the
 * pane's card checks one word. A 503 keeps the button off with the reason.
 */

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { aiCheckWordIds, sortedForms, type BlendReviewWord } from "@/lib/blendWord/review";
import { ENDING_LABELS } from "@/lib/blendWord/config";
import { useBlendAiCheck } from "@/lib/hooks/useBlendReview";
import type { InboxItem } from "@/lib/review/inbox";
import { ContextCard } from "../../parts";

function ResultLine({ ai }: { ai: ReturnType<typeof useBlendAiCheck> }) {
  const text = ai.result?.message ?? ai.disabledReason;
  if (!text) return null;
  return (
    <p
      role={ai.result && !ai.result.ok ? "alert" : undefined}
      className={cn("text-[11.5px]", ai.result && !ai.result.ok ? "text-destructive" : "text-muted-foreground")}
    >
      {text}
    </p>
  );
}

/** The Blend lens's list tool: AI check the listed words. */
export function BlendListTools({ items }: { items: InboxItem[] }) {
  const ai = useBlendAiCheck();
  const words = aiCheckWordIds(items.filter((i) => i.kind === "blend").map((i) => i.data as BlendReviewWord));
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void ai.check(words)}
          disabled={ai.pending || !!ai.disabledReason || words.length === 0}
          title={ai.disabledReason ?? "Ask the AI to flag wrong marks and practice words in the listed words."}
        >
          {ai.pending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="me-1.5 h-4 w-4" />}
          AI check the listed words ({words.length})
        </Button>
        <span className="text-[11.5px] text-muted-foreground">up to 50</span>
      </div>
      <ResultLine ai={ai} />
    </div>
  );
}

/** The pane's AI check card: whether each form was checked, and a check of this word. */
export function BlendAiCheckCard({ word }: { word: BlendReviewWord }) {
  const ai = useBlendAiCheck();
  const forms = sortedForms(word);
  return (
    <ContextCard title="AI check">
      <ul className="mb-2 grid gap-0.5 text-[12.5px]">
        {forms.map((f) => (
          <li key={f.form}>
            {ENDING_LABELS[f.form].label}: <span className="text-muted-foreground">{f.aiCheckedAt ? "AI checked" : "not AI checked yet"}</span>
          </li>
        ))}
      </ul>
      <p className="mb-2 text-[12px] text-muted-foreground">The check flags wrong marks and likely practice words.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void ai.check([word.wordId])}
        disabled={ai.pending || !!ai.disabledReason}
        title={ai.disabledReason ?? undefined}
      >
        {ai.pending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="me-1.5 h-4 w-4" />}
        Run AI check on this word
      </Button>
      <div className="mt-1.5">
        <ResultLine ai={ai} />
      </div>
    </ContextCard>
  );
}
