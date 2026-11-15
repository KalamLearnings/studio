"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FLAG_LABELS, validateNote, type QueueRow, type ReviewNote } from "@/lib/words/review/queue";
import type { ReviewResult } from "@/lib/hooks/useWordReviewQueue";

const CLASS_LABELS: Record<string, string> = {
  real_full: "Fully vowelled",
  real_partial: "Partly vowelled",
  case_variant: "Case-ending variant",
};

interface Props {
  row: QueueRow;
  note: ReviewNote | undefined;
  onReviewed: (wordId: string, reviewed: boolean) => Promise<ReviewResult>;
  onNote: (wordId: string, note: Omit<ReviewNote, "wordId"> | null) => void;
}

/** One spelling of the queue: its class, flags, the suggested action, and the reviewer's buttons. */
export function WordReviewRow({ row, note, onReviewed, onNote }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fixing, setFixing] = React.useState(false);
  const [fix, setFix] = React.useState(note?.correctedSpelling ?? row.word.arabic);

  const run = async (reviewed: boolean) => {
    setBusy(true);
    setError(null);
    const res = await onReviewed(row.word.id, reviewed);
    if (!res.ok) setError(res.message);
    setBusy(false);
  };

  const saveFix = () => {
    const draft = { decision: "wrong" as const, correctedSpelling: fix.trim() };
    const problem = validateNote(row, draft);
    if (problem) return setError(problem);
    setError(null);
    onNote(row.word.id, draft);
    setFixing(false);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-8 text-xs text-muted-foreground">#{row.rank}</span>
            <span className="font-arabic text-3xl" dir="rtl">{row.word.arabic}</span>
            <Badge variant="secondary">{CLASS_LABELS[row.class] ?? row.class}</Badge>
            {row.flags.map((f) => (
              <Badge key={f} variant="outline">{FLAG_LABELS[f]}</Badge>
            ))}
            {row.reviewed && <Badge>Approved</Badge>}
            {note?.decision === "pseudo" && <Badge variant="destructive">Noted: not a real word</Badge>}
            {note?.decision === "wrong" && (
              <Badge variant="destructive">
                Noted: respell as <span className="font-arabic" dir="rtl">{note.correctedSpelling}</span>
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Used by {row.word.usage_count} {row.word.usage_count === 1 ? "activity" : "activities"}
            {row.skeletonSiblings > 0 && ` · ${row.skeletonSiblings} other vowelings`}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{row.action.text}</p>

        {fixing && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              dir="rtl"
              className="font-arabic w-56 text-lg"
              value={fix}
              onChange={(e) => setFix(e.target.value)}
              aria-label="Corrected spelling"
            />
            <Button type="button" size="sm" onClick={saveFix}>Save note</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setFixing(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {row.reviewed ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run(false)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Withdraw approval
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={() => void run(true)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Approve
            </Button>
          )}
          {note?.decision === "pseudo" ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onNote(row.word.id, null)}>Clear note</Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => onNote(row.word.id, { decision: "pseudo" })}>
              Not a real word
            </Button>
          )}
          {note?.decision === "wrong" ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onNote(row.word.id, null)}>Clear note</Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => { setFixing(true); setError(null); }}>
              Wrong harakat
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
