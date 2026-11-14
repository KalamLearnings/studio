"use client";

import * as React from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { splitReviewBody, type SplitReviewBody } from "@/lib/blendWord/review";

interface SplitReviewControlsProps {
  /** The current review in a line. */
  status: string;
  onReview: (body: SplitReviewBody) => Promise<{ ok: boolean; message?: string }>;
}

/** Approve or reject a form's split, with a note (a rejection needs one). */
export function SplitReviewControls({ status, onReview }: SplitReviewControlsProps) {
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState<null | "approved" | "rejected">(null);
  const [error, setError] = React.useState<string | null>(null);

  const send = async (decision: "approved" | "rejected") => {
    setError(null);
    const body = splitReviewBody(decision, note);
    if (!body.ok) {
      setError(body.error);
      return;
    }
    setPending(decision);
    const res = await onReview(body.body);
    setPending(null);
    if (res.ok) setNote("");
    else setError(res.message ?? "The review was not saved.");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{status}</p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Note (needed to reject)"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending !== null} onClick={() => send("rejected")}>
          {pending === "rejected" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
          Reject split
        </Button>
        <Button type="button" size="sm" disabled={pending !== null} onClick={() => send("approved")}>
          {pending === "approved" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
          Approve split
        </Button>
      </div>
    </div>
  );
}
