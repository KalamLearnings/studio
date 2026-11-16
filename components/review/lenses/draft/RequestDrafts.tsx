"use client";

/**
 * Request a draft for one node: the drafts lens tool and the "More drafts
 * for this node" card. Any staff member may request; the outcome (drafted,
 * word requested, rejected by the checks, no draft) shows beside the button.
 * When generation is switched off the server says so, and that is shown
 * calmly.
 */

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestNodeDraft } from "@/lib/api/generation";
import { ApiError } from "@/lib/api/client";
import { describeGenerationError, describeRequestResult, GENERATION_TYPES } from "@/lib/generation/drafts";
import { OPEN_WORD_REQUESTS_KEY, PENDING_DRAFTS_KEY } from "@/lib/hooks/useReviewDraftPhraseSources";

const isOff = (e: unknown) => e instanceof ApiError && (e.code === "GENERATION_DISABLED" || e.status === 503);

export function RequestDrafts({
  nodeId,
  defaultType,
  label = "Request a draft",
}: {
  /** Empty: no node picked yet. */
  nodeId: string;
  defaultType?: string;
  label?: string;
}) {
  const qc = useQueryClient();
  const [type, setType] = React.useState<string>(defaultType ?? GENERATION_TYPES[0].value);
  const request = useMutation({
    mutationFn: () => requestNodeDraft(nodeId, { type }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PENDING_DRAFTS_KEY });
      void qc.invalidateQueries({ queryKey: OPEN_WORD_REQUESTS_KEY });
    },
  });
  const reset = request.reset;
  React.useEffect(() => reset(), [nodeId, reset]);

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Activity type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="h-[30px] min-w-[150px] flex-1 rounded-md border bg-background px-1.5 text-xs"
        >
          {GENERATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {nodeId ? (
          <Button type="button" size="sm" variant="outline" className="h-[30px]" onClick={() => request.mutate()} disabled={request.isPending}>
            {request.isPending && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {label}
          </Button>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">Pick a node to request drafts.</span>
        )}
      </div>
      <p className="text-xs" aria-live="polite">
        {request.isError && (
          <span className={isOff(request.error) ? "text-muted-foreground" : "text-destructive"}>
            {describeGenerationError(request.error)}
          </span>
        )}
        {request.data && <span>{describeRequestResult(request.data)}</span>}
      </p>
    </div>
  );
}
