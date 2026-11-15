"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approvePhrase, listPhrases, revokePhrase } from "@/lib/api/phraseReview";
import { usePhraseReviewer } from "@/lib/hooks/usePhraseReviewer";
import { phraseReviewErrorText, reasonText, usedInText, type PhraseEntry } from "@/lib/phrases/phraseReview";

const KEY = ["reading-phrases"] as const;

function PhraseCard({ entry, canReview }: { entry: PhraseEntry; canReview: boolean }) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: KEY });
  const approve = useMutation({ mutationFn: () => approvePhrase(entry), onSuccess: done });
  const revoke = useMutation({ mutationFn: () => revokePhrase(entry.phrase_key), onSuccess: done });
  const busy = approve.isPending || revoke.isPending;
  const error = approve.error ?? revoke.error;
  const pending = entry.reason !== null;

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={pending ? "secondary" : "default"}>{pending ? "Pending" : "Approved"}</Badge>
          <Badge variant="outline">{entry.is_sentence ? "Sentence" : "Phrase"}</Badge>
          {entry.approval && (
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.approval.reviewed_at), { addSuffix: true })}
            </span>
          )}
        </div>
        <p className="font-arabic text-3xl" dir="rtl" lang="ar">
          {entry.text ?? <span className="text-sm text-muted-foreground">A word row is missing</span>}
        </p>
        {pending && <p className="text-sm text-muted-foreground">{reasonText(entry.reason)}</p>}
        {entry.word_problems.length > 0 && (
          <ul className="space-y-0.5 text-sm text-amber-700 dark:text-amber-400">
            {entry.word_problems.map((p) => (
              <li key={`${p.word_id}-${p.issue}`}>{p.message}</li>
            ))}
          </ul>
        )}
        {entry.used_in.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {entry.used_in.map((u) => (
              <li key={`${u.activity_id}-${u.path}`}>{usedInText(u)}</li>
            ))}
          </ul>
        )}
        {canReview && (
          <div className="flex gap-2">
            {pending ? (
              <Button type="button" size="sm" disabled={busy || entry.word_problems.length > 0} onClick={() => approve.mutate()}>
                {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Approve
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => revoke.mutate()}>
                {revoke.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Revoke
              </Button>
            )}
          </div>
        )}
        {error != null && <p className="text-sm text-destructive">{phraseReviewErrorText(error)}</p>}
      </CardContent>
    </Card>
  );
}

export default function PhraseReviewPage() {
  const canReview = usePhraseReviewer();
  const list = useQuery({ queryKey: KEY, queryFn: listPhrases });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Phrase review</h1>
        <p className="max-w-2xl text-muted-foreground">
          A native Arabic reader approves each phrase or sentence a reading activity uses. The reviewer should not be
          the phrase&apos;s author (team rule; the system does not check).
          {!canReview && " Approve and revoke are shown to phrase reviewers and curriculum leads only."}
        </p>
      </div>
      {list.isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading phrases...
        </div>
      )}
      {list.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Phrases could not be loaded: {phraseReviewErrorText(list.error)}
        </p>
      )}
      {list.data && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Pending ({list.data.pending.length})</h2>
            {list.data.pending.length === 0 && <p className="text-sm text-muted-foreground">No phrase waits for approval.</p>}
            {list.data.pending.map((e) => (
              <PhraseCard key={`${e.phrase_key}-${e.is_sentence}`} entry={e} canReview={canReview} />
            ))}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Approved ({list.data.approved.length})</h2>
            {list.data.approved.length === 0 && <p className="text-sm text-muted-foreground">Nothing approved yet.</p>}
            {list.data.approved.map((e) => (
              <PhraseCard key={`${e.phrase_key}-${e.is_sentence}`} entry={e} canReview={canReview} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
