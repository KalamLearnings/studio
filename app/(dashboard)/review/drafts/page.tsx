"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurricula } from "@/lib/hooks/useCurriculum";
import { useAllNodes } from "@/lib/hooks/useNodes";
import { useCurriculumLead } from "@/lib/hooks/useCurriculumLead";
import { useDraftActions, useNodeDrafts, useWordRequests } from "@/lib/hooks/useDrafts";
import {
  describeGenerationError,
  describeRequestResult,
  draftStatus,
  failedChecks,
  GENERATION_TYPES,
  sortDrafts,
  STATUS_LABELS,
  type DraftRow,
} from "@/lib/generation/drafts";

function DraftCard({ draft, nodeTitle, isLead }: { draft: DraftRow; nodeTitle: string; isLead: boolean }) {
  const { approve, reject } = useDraftActions();
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const status = draftStatus(draft);
  const p = draft.provenance;
  const busy = approve.isPending || reject.isPending;
  const error = approve.error ?? reject.error;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "rejected" ? "destructive" : status === "pending" ? "secondary" : "default"}>
            {STATUS_LABELS[status]}
          </Badge>
          <span className="font-medium">{draft.type}</span>
          <span className="text-sm text-muted-foreground">in {nodeTitle}</span>
          {draft.created_at && (
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {p && (
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-muted-foreground">Model: </dt><dd className="inline">{p.model}</dd></div>
            <div>
              <dt className="inline text-muted-foreground">Template: </dt>
              <dd className="inline">{p.template.type} v{p.template.version}, prompt v{p.prompt_version}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Exemplars used: </dt>
              <dd className="inline">{p.exemplar_ids.length === 0 ? "none" : p.exemplar_ids.length}</dd>
            </div>
            {p.required_form && (
              <div><dt className="inline text-muted-foreground">Required form: </dt><dd className="inline">{p.required_form}</dd></div>
            )}
            {(p.edits?.length ?? 0) > 0 && (
              <div><dt className="inline text-muted-foreground">Edited by hand: </dt><dd className="inline">{p.edits!.length} time(s)</dd></div>
            )}
          </dl>
        )}

        {p && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Save checks:</span>
            {p.checks.length === 0 && <span className="text-sm">none recorded</span>}
            {p.checks.map((c) => (
              <Badge key={c.check} variant={c.status === "pass" ? "outline" : "destructive"}>
                {c.check}: {c.status}
              </Badge>
            ))}
          </div>
        )}
        {failedChecks(p).length > 0 && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
            Findings: {failedChecks(p).map((c) => c.check).join(", ")}
          </p>
        )}
        {p?.review?.reason && <p className="text-sm text-muted-foreground">Rejected: {p.review.reason}</p>}

        {status === "pending" && (
          <p className="text-xs text-muted-foreground">
            Approving does not publish. After approval, publish it from the builder as usual.
          </p>
        )}

        {isLead && status === "pending" && (
          <div className="flex flex-wrap items-center gap-2">
            {rejecting ? (
              <>
                <Input
                  className="w-72"
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-label="Rejection reason"
                />
                <Button
                  type="button" size="sm" variant="destructive" disabled={busy}
                  onClick={() => reject.mutate({ id: draft.id, reason: reason.trim() || undefined })}
                >
                  {reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reject draft
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button type="button" size="sm" disabled={busy} onClick={() => approve.mutate(draft.id)}>
                  {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Approve
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
        {error != null && <p className="text-sm text-destructive">{describeGenerationError(error)}</p>}
      </CardContent>
    </Card>
  );
}

export default function DraftReviewPage() {
  const isLead = useCurriculumLead();
  const { data: curricula } = useCurricula();
  const [curriculumId, setCurriculumId] = React.useState("");
  const [nodeId, setNodeId] = React.useState("");
  const [type, setType] = React.useState<string>(GENERATION_TYPES[0].value);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    if (!curriculumId && curricula?.length) setCurriculumId(curricula[0].id);
  }, [curricula, curriculumId]);

  const { data: nodes } = useAllNodes(curriculumId);
  const nodeIds = React.useMemo(
    () => (nodeId ? [nodeId] : (nodes ?? []).map((n) => n.id)),
    [nodeId, nodes],
  );
  const results = useNodeDrafts(nodeIds);
  const { request } = useDraftActions();
  const wordRequests = useWordRequests();

  const titleOf = React.useMemo(() => new Map((nodes ?? []).map((n) => [n.id, n.title.en])), [nodes]);
  const loading = results.some((r) => r.isLoading);
  const failed = results.find((r) => r.error);
  const drafts = React.useMemo(
    () => sortDrafts(results.flatMap((r) => r.data ?? [])).filter((d) => showAll || draftStatus(d) === "pending"),
    [results, showAll],
  );
  const allCount = results.reduce((n, r) => n + (r.data?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Draft review</h1>
        <p className="max-w-2xl text-muted-foreground">
          AI-drafted activities are saved unpublished. A curriculum lead approves or rejects each one; approving does
          not publish it. Publishing is the normal activity update, and the server refuses it until the draft is approved.
          {!isLead && " Approve and reject are shown to curriculum leads only."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Curriculum"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={curriculumId}
          onChange={(e) => { setCurriculumId(e.target.value); setNodeId(""); request.reset(); }}
        >
          {(curricula ?? []).map((c) => <option key={c.id} value={c.id}>{c.title.en}</option>)}
        </select>
        <select
          aria-label="Node"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={nodeId}
          onChange={(e) => { setNodeId(e.target.value); request.reset(); }}
        >
          <option value="">Every node</option>
          {(nodes ?? []).map((n) => <option key={n.id} value={n.id}>{n.title.en}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show approved, rejected and published
        </label>
      </div>

      {nodeId && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Activity type"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {GENERATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Button type="button" disabled={request.isPending} onClick={() => request.mutate({ nodeId, type })}>
              {request.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Request drafts for this node
            </Button>
          </div>
          {request.isError && <p className="text-sm text-destructive">{describeGenerationError(request.error)}</p>}
          {request.data && <p className="text-sm">{describeRequestResult(request.data)}</p>}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading drafts...
        </div>
      )}
      {failed && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Drafts could not be loaded: {describeGenerationError(failed.error)}
        </p>
      )}
      {!loading && !failed && drafts.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {allCount === 0 ? "No AI drafts here." : "No draft waits for approval."}
        </p>
      )}
      <div className="space-y-3">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} nodeTitle={titleOf.get(d.node_id) ?? d.node_id} isLead={isLead} />
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Open word requests</h2>
        <p className="text-sm text-muted-foreground">
          Words the generator needed and the reviewed library lacks. Read only.
        </p>
        {wordRequests.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {wordRequests.error && (
          <p className="text-sm text-destructive">{describeGenerationError(wordRequests.error)}</p>
        )}
        {wordRequests.data?.length === 0 && <p className="text-sm text-muted-foreground">No open word requests.</p>}
        <ul className="space-y-2">
          {wordRequests.data?.map((w) => (
            <li key={w.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{w.activity_type}</Badge>
                <span>{w.description_en}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {titleOf.get(w.node_id) ?? "another node"} · {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
