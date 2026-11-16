"use client";

/**
 * The decision bar and keys both draft lenses share (CM-DRAFTS). `a`
 * approves through the gated routes, `r` skips (remembered in this browser;
 * the backend has no dismiss). Only a curriculum lead or a phrase reviewer
 * decides; other staff see the draft read only, with a GateBar.
 */

import * as React from "react";
import { Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraftCache } from "@/lib/hooks/useContentDrafts";
import { showAgainDraft, skipDraft } from "@/lib/review/actions/contentDrafts";
import { canDecide } from "@/lib/review/inbox";
import type { DraftItem } from "@/lib/review/normalise/drafts";
import { cn } from "@/lib/utils";
import { usePaneCommands } from "../../commands";
import { DecisionBar, GateBar, NextHint } from "../../PaneFrame";
import { KBD_ON_BUTTON, Kbd } from "../../parts";
import type { PaneProps } from "../types";

/** True when this reviewer may decide the item now (inputs are shown only then). */
export const canDecideDraft = (props: PaneProps) => canDecide("phrase", props.roles) && props.item.state === "todo";

export function DraftBar({
  props,
  item,
  approve,
  blocked,
  approveLabel,
}: {
  props: PaneProps;
  item: DraftItem;
  approve: (() => void) | null;
  blocked: string | null;
  approveLabel: string;
}) {
  const { roles, userId, decide, busy, error, clearError } = props;
  const cache = useDraftCache(userId);
  const can = canDecide("phrase", roles);
  const todo = item.state === "todo";
  const skip = () => decide(skipDraft(item, cache));
  const done = item.kind === "label" ? "Connected." : "Saved.";

  usePaneCommands((cmd) => {
    if (busy || !can || !todo) return false;
    if (cmd.type === "approve" && approve) {
      approve();
      return true;
    }
    if (cmd.type === "reject") {
      skip();
      return true;
    }
    return false;
  });

  if (!can) {
    return <GateBar item={item} roles={roles} status={item.state === "approved" ? done : item.state === "rejected" ? "Skipped." : "Drafted."} />;
  }
  if (item.state === "approved") return <DecisionBar busy={busy} error={error} onDismissError={clearError} status={`${done} u undoes it.`} />;
  if (item.state === "rejected") {
    return (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status="Skipped. It is remembered in this browser only."
        actions={
          <Button variant="outline" size="sm" onClick={() => decide(showAgainDraft(item, cache))}>
            Show it again
          </Button>
        }
      />
    );
  }
  return (
    <DecisionBar
      busy={busy}
      error={error}
      onDismissError={clearError}
      status={blocked ?? <NextHint />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={skip}>
            <SkipForward className="me-1.5 h-4 w-4" aria-hidden="true" /> Skip <Kbd className="ms-2">r</Kbd>
          </Button>
          <Button
            size="sm"
            className="bg-success text-success-foreground hover:bg-success/90"
            disabled={!approve}
            onClick={() => approve?.()}
          >
            <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> {approveLabel} <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
          </Button>
        </>
      }
    />
  );
}

/** The confidence, as a pill. */
export function confidencePill(c: "high" | "medium" | "low", score: number | null) {
  const text = `${c[0].toUpperCase()}${c.slice(1)} confidence${score !== null ? ` (${Math.round(score * 100)}%)` : ""}`;
  return { tone: c === "high" ? ("ok" as const) : c === "medium" ? ("info" as const) : ("neutral" as const), text };
}
