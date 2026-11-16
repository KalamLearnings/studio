"use client";

/**
 * The frame every lens pane renders into: crumbs, the evidence column, the
 * context column (beside or below, by the pane's width), and the sticky
 * decision bar. Also the hero and the bars a pane composes.
 */

import * as React from "react";
import { Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GATE_TEXT, KIND_META, canDecide, shortAge, statusPill, type InboxItem, type ReviewRoles } from "@/lib/review/inbox";
import type { DecisionStatus } from "@/lib/review/decisions";
import { Ar, Kbd, KindDot, StatusPill } from "./parts";
import styles from "./review.module.css";

export const BackToListContext = React.createContext<(() => void) | null>(null);

export function PaneFrame({
  item,
  main,
  context,
  bar,
}: {
  item: InboxItem;
  main: React.ReactNode;
  context?: React.ReactNode;
  bar: React.ReactNode;
}) {
  const back = React.useContext(BackToListContext);
  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className={cn(styles.inner, !context && styles.single)}>
          <nav aria-label="Breadcrumb" className="col-span-full flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {back && (
              <button type="button" onClick={back} className="text-primary hover:underline min-[860px]:hidden">
                Back to the list
              </button>
            )}
            <span>{KIND_META[item.kind].label}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono">{item.id}</span>
          </nav>
          <div className="grid min-w-0 content-start gap-3.5">{main}</div>
          {context && (
            <aside aria-label="Context" className={styles.context}>
              {context}
            </aside>
          )}
        </div>
      </div>
      <div className="flex min-h-[58px] flex-none flex-wrap items-center gap-2 border-t bg-card px-4 py-2.5 min-[860px]:px-7">
        {bar}
      </div>
    </>
  );
}

export function Hero({
  item,
  roles,
  userId,
  now,
  big,
  sub,
  children,
  long = false,
}: {
  item: InboxItem;
  roles: ReviewRoles;
  userId: string | null;
  now: number;
  /** Defaults to the item's title in large Arabic. */
  big?: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  long?: boolean;
}) {
  const waiting = item.state === "todo" || item.state === "failed" ? shortAge(item.waitingSince, now) : "";
  const decided = item.decidedAt ? shortAge(item.decidedAt, now) : "";
  const by = item.decidedBy && item.decidedBy === userId ? "by you" : "";
  return (
    <section className="min-w-0 rounded-xl border bg-card px-5 pb-4 pt-4" aria-label={KIND_META[item.kind].one}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <KindDot kind={item.kind} />
          {KIND_META[item.kind].one}
        </span>
        <StatusPill pill={statusPill(item, roles)} />
        {waiting && <span>waiting {waiting}</span>}
        {(decided || by) && (
          <span>
            {["decided", by, decided && decided !== "just now" ? `${decided} ago` : decided].filter(Boolean).join(" ")}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex min-w-0 items-center justify-end gap-4">
        {big ?? (
          <Ar
            className={cn(
              "min-w-0 font-medium leading-[1.75]",
              long ? "text-[38px]" : "text-[46px] min-[1280px]:text-[54px]",
            )}
          >
            {item.title}
          </Ar>
        )}
      </div>
      {sub && <div className="text-sm text-muted-foreground">{sub}</div>}
      {children}
    </section>
  );
}

const BUSY_TEXT: Partial<Record<DecisionStatus, React.ReactNode>> = {
  held: (
    <>
      Sending in a few seconds. <Kbd>u</Kbd> undoes it.
    </>
  ),
  sending: "Saving...",
  undoing: "Undoing...",
};

/** The sticky decision bar: a status line on the left, the actions on the right. */
export function DecisionBar({
  status,
  actions,
  error,
  onDismissError,
  busy,
}: {
  status?: React.ReactNode;
  actions?: React.ReactNode;
  error?: string | null;
  onDismissError?: () => void;
  busy?: DecisionStatus | null;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="flex w-full items-start gap-2 text-[12.5px] text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]">
          <span className="flex-1">{error}</span>
          {onDismissError && (
            <button type="button" onClick={onDismissError} aria-label="Dismiss" className="rounded p-0.5 hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </p>
      )}
      <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground" aria-live="polite">
        {busy && BUSY_TEXT[busy] ? BUSY_TEXT[busy] : status}
      </span>
      <span className="flex-1" />
      {!busy && actions && <span className="ms-auto flex flex-wrap justify-end gap-2">{actions}</span>}
    </>
  );
}

/** For a kind your role cannot decide: the status, a lock and who decides. No disabled buttons. */
export function GateBar({ item, roles, status }: { item: InboxItem; roles: ReviewRoles; status: string }) {
  const gate = KIND_META[item.kind].gate;
  if (gate === "staff" || canDecide(gate, roles)) return null;
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span>
        {status} <span className="text-muted-foreground">Only {GATE_TEXT[gate]} can decide this.</span>
      </span>
    </div>
  );
}

/** "then moves to the next", after the actions' status line. */
export function NextHint() {
  return <span className="text-xs text-muted-foreground">then moves to the next</span>;
}
