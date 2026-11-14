"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { filterCounts, filterQueue, aiCheckWordIds, type ReviewFilter } from "@/lib/blendWord/review";
import { audioErrorView } from "@/lib/blendWord/takes";
import { useBlendAiCheck, useBlendAudioActions, useBlendReviewQueue } from "@/lib/hooks/useBlendReview";
import { ReviewQueueHeader, ReviewWordCard } from "./_components";

export default function BlendReviewPage() {
  const queue = useBlendReviewQueue();
  const actions = useBlendAudioActions();
  const ai = useBlendAiCheck();
  const [filter, setFilter] = React.useState<ReviewFilter>("needs_review");

  const items = React.useMemo(() => queue.data?.items ?? [], [queue.data]);
  const shown = React.useMemo(() => filterQueue(items, filter), [items, filter]);
  const counts = React.useMemo(() => filterCounts(items), [items]);
  const aiWords = aiCheckWordIds(shown);

  return (
    <div className="space-y-6">
      <ReviewQueueHeader
        filter={filter}
        counts={counts}
        onFilter={setFilter}
        refreshing={queue.isFetching}
        onRefresh={() => void queue.refetch()}
        aiCheck={{
          pending: ai.pending,
          disabledReason: ai.disabledReason,
          result: ai.result,
          wordCount: aiWords.length,
          onRun: () => void ai.check(aiWords),
        }}
      />

      {actions.generationOff && (
        <p className="rounded-md border p-2 text-sm text-muted-foreground">
          {actions.generationOff} Generate and Regenerate are off; you can still review the takes.
        </p>
      )}

      {queue.isLoading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading the queue...
        </div>
      )}
      {queue.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          The queue could not be loaded: {audioErrorView(queue.error).message}
        </p>
      )}
      {!queue.isLoading && !queue.error && shown.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          {items.length === 0 ? "Nothing waits for review." : "No word matches this filter."}
        </p>
      )}

      <div className="space-y-4">
        {shown.map((item) => (
          <ReviewWordCard key={item.wordId} item={item} actions={actions} />
        ))}
      </div>
    </div>
  );
}
