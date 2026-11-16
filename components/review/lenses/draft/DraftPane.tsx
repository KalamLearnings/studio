"use client";

/**
 * The AI draft pane (CW-7): what the child would see, the save checks, the
 * provenance, and the lead's decision. Approve (`a`) and Reject (`r`, an
 * optional reason, `enter`) are held 5 s so Undo cancels them; neither
 * publishes. Only a curriculum lead decides; other staff see the status and
 * who decides. The exemplar flag stays in the builder.
 */

import * as React from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { draftStatus, failedChecks, STATUS_LABELS } from "@/lib/generation/drafts";
import { useDraftCache } from "@/lib/hooks/useReviewDraftPhraseSources";
import { approveDraftSpec, rejectDraftSpec } from "@/lib/review/actions/drafts";
import { canDecide, shortAge } from "@/lib/review/inbox";
import { titleText, type DraftItem } from "@/lib/review/normalise/sources";
import { usePaneCommands } from "../../commands";
import { DecisionBar, GateBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { Chip, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say } from "../../parts";
import type { PaneProps } from "../types";
import { DraftPreview } from "./DraftPreview";
import { RequestDrafts } from "./RequestDrafts";

export function DraftPane(props: PaneProps) {
  const { roles, userId, decide, error, clearError, busy, now } = props;
  const item = props.item as DraftItem;
  const d = item.data;
  const p = d.provenance;
  const cache = useDraftCache();
  const lead = canDecide("lead", roles);
  const todo = item.state === "todo";
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const noteRef = React.useRef<HTMLInputElement>(null);

  const node = titleText(d.node_title) ?? d.node_id;
  const where = [titleText(d.topic_title), titleText(d.curriculum_title)].filter(Boolean).join(" · ");
  const builderHref = d.curriculum_id ? `/curricula/${encodeURIComponent(d.curriculum_id)}/builder` : null;
  const openBuilder = () => {
    if (builderHref) window.open(builderHref, "_blank", "noopener");
  };

  const approve = () => lead && todo && decide(approveDraftSpec(item, cache, userId));
  const startReject = () => {
    if (!lead || !todo) return;
    setRejecting("");
    requestAnimationFrame(() => noteRef.current?.focus());
  };
  const confirmReject = () => {
    if (rejecting === null) return;
    const reason = rejecting;
    setRejecting(null);
    decide(rejectDraftSpec(item, reason, cache, userId));
  };

  usePaneCommands((cmd) => {
    if (busy && cmd.type !== "escape") return false;
    switch (cmd.type) {
      case "approve":
        if (rejecting !== null || !lead || !todo) return false;
        approve();
        return true;
      case "reject":
        if (rejecting !== null || !lead || !todo) return false;
        startReject();
        return true;
      case "confirm":
        if (rejecting === null) return false;
        confirmReject();
        return true;
      case "escape":
        if (rejecting === null) return false;
        setRejecting(null);
        return true;
      case "openBuilder":
        if (!builderHref) return false;
        openBuilder();
        return true;
      default:
        return false;
    }
  });

  const status = draftStatus(d);
  const failed = failedChecks(p);
  const rejected = p?.review;

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        big={<div className="w-full py-1.5 text-left text-[26px] font-semibold leading-tight">{item.title}</div>}
        sub={
          <>
            in <b className="font-medium text-foreground">{node}</b>
            {where && <> · {where}</>} · <span className="font-mono">{d.type}</span>
          </>
        }
      >
        <Say>Approving does not publish. After approval, publish it from the builder as usual.</Say>
        {item.state === "rejected" && (
          <Say tone="err">
            Rejected{rejected?.reason ? `: ${rejected.reason}` : "."} A rejected draft cannot be approved; request a new one.
          </Say>
        )}
        {failed.length > 0 && <Say tone="warn">Findings: {failed.map((c) => c.check).join(", ")}</Say>}
      </Hero>

      <PaneCard
        title="What the child sees"
        aside={
          builderHref && (
            <button type="button" onClick={openBuilder} className="inline-flex items-center gap-1.5 text-xs font-normal text-primary hover:underline">
              Open in the builder <ExternalLink className="h-3 w-3" aria-hidden="true" /> <Kbd>o</Kbd>
            </button>
          )
        }
      >
        <DraftPreview type={d.type} config={d.config} />
      </PaneCard>

      <PaneCard title="Save checks">
        {!p || p.checks.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No checks recorded.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {p.checks.map((c) => (
                <Chip key={c.check} tone={c.status === "fail" ? "fail" : c.status === "note" ? "note" : "pass"}>
                  {c.check}: {c.status}
                </Chip>
              ))}
            </div>
            {p.checks.some((c) => c.status === "note") && (
              <p className="mt-2 text-xs text-muted-foreground">A note is information, never a failure.</p>
            )}
          </>
        )}
      </PaneCard>

      {rejecting !== null && (
        <PaneCard title="Reject the draft">
          <input
            ref={noteRef}
            aria-label="Reason (optional)"
            placeholder="Reason (optional)"
            value={rejecting}
            maxLength={500}
            onChange={(e) => setRejecting(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </PaneCard>
      )}
    </>
  );

  const context = (
    <>
      <ContextCard title="Provenance">
        {p ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
            <dt className="text-muted-foreground">Model</dt>
            <dd className="min-w-0 break-words">{p.model}</dd>
            <dt className="text-muted-foreground">Template</dt>
            <dd className="font-mono">
              {p.template.type}@{p.template.version}
            </dd>
            <dt className="text-muted-foreground">Prompt</dt>
            <dd className="font-mono">v{p.prompt_version}</dd>
            <dt className="text-muted-foreground">Exemplars</dt>
            <dd>{p.exemplar_ids.length || "none"}</dd>
            {p.required_form && (
              <>
                <dt className="text-muted-foreground">Required form</dt>
                <dd>{p.required_form}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Requested</dt>
            <dd>
              {p.requested_by === userId ? "by you" : "by staff"}
              {p.created_at && `, ${shortAge(p.created_at, now)} ago`}
            </dd>
            {(p.edits?.length ?? 0) > 0 && (
              <>
                <dt className="text-muted-foreground">Edited by hand</dt>
                <dd>
                  {p.edits!.length} {p.edits!.length === 1 ? "time" : "times"}
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">No provenance recorded.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Exemplars are marked in the builder, on a published activity.</p>
      </ContextCard>
      <ContextCard title="More drafts for this node">
        <RequestDrafts nodeId={d.node_id} defaultType={d.type} />
      </ContextCard>
    </>
  );

  let bar: React.ReactNode;
  if (!todo) {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={item.state === "rejected" ? "Rejected. Request a new draft if the node still needs one." : `${STATUS_LABELS[status]}.`}
      />
    );
  } else if (!lead) {
    bar = <GateBar item={item} roles={roles} status="Waiting for approval." />;
  } else if (rejecting !== null) {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status="Say why, if it helps the next draft."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmReject}>
              Reject draft <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
            </Button>
          </>
        }
      />
    );
  } else {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={<NextHint />}
        actions={
          <>
            {builderHref && (
              <Button variant="outline" size="sm" onClick={openBuilder}>
                Open in builder <Kbd className="ms-2">o</Kbd>
              </Button>
            )}
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={startReject}>
              Reject <Kbd className="ms-2">r</Kbd>
            </Button>
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={approve}>
              <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Approve <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
            </Button>
          </>
        }
      />
    );
  }

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
