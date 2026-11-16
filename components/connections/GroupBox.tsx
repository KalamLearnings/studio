"use client";

/**
 * One box of the focus frame: a heading, its plain sentence, and its items
 * as chips (or rows, for lessons). A worked-out box has a lock and a dashed
 * edge; a box that should hold something and does not has the amber ring.
 */

import * as React from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActivityLabel } from "@/lib/constants/curriculum";
import type { Graph } from "@/lib/connections/graph";
import { CONNECTION_KINDS } from "@/lib/connections/kinds";
import type { NodeKey } from "@/lib/connections/keys";
import type { ActivityRow, Box } from "@/lib/connections/neighbourhood";
import { builderHref } from "@/lib/words/usage";
import { Badge, CONNECTION_COLOR, LockIcon, NodeChip } from "./parts";
import { useEditing } from "./extension";
import s from "./words.module.css";

const MAX_CHIPS = 10;
const MAX_ROWS = 5;

const ROLE_LABEL = { target: "target", distractor: "distractor", exposure: "shown" } as const;

function ActivityRowView({ row, graph, showForms }: { row: ActivityRow; graph: Graph; showForms: boolean }) {
  const href = builderHref(row.curriculumId);
  const name = getActivityLabel(row.type);
  const label = name === "Activity" ? row.type.replace(/_/g, " ") : name;
  const body = (
    <>
      <span className={s.dot} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px]">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground" dir="auto">
          {row.path}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-1">
          {row.roles.map((r) => (
            <Badge key={r}>{ROLE_LABEL[r]}</Badge>
          ))}
          {showForms &&
            row.wordIds.map((id) => (
              <span key={id} lang="ar" dir="rtl" className="font-naskh text-[15px] leading-[1.4] text-muted-foreground [unicode-bidi:isolate]">
                {graph.words.get(id)?.arabic ?? ""}
              </span>
            ))}
        </span>
      </span>
      {href && <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
    </>
  );
  const cls = `${s.chip} flex w-full items-start px-2.5 py-1.5`;
  return href ? (
    <a href={href} className={cls} style={{ ["--kc" as string]: "var(--k-activity)" }} aria-label={`${label}, ${row.path}. Open in the lesson builder`}>
      {body}
    </a>
  ) : (
    <div className={cls} style={{ ["--kc" as string]: "var(--k-activity)" }}>
      {body}
    </div>
  );
}

export interface GroupBoxProps {
  box: Box;
  graph: Graph;
  /** The frame's focus: the box's items connect to it. */
  focus: NodeKey;
  onOpen: (key: NodeKey) => void;
}

export const GroupBox = React.forwardRef<HTMLElement, GroupBoxProps>(function GroupBox(
  { box, graph, focus, onOpen },
  ref,
) {
  // CG-5's edit affordances; null while the page is read only.
  const actions = useEditing();
  const [all, setAll] = React.useState(false);
  const color = CONNECTION_COLOR[box.kind];
  const titleId = React.useId();
  const activities = box.activities ?? [];
  const count = box.rows ? activities.length : box.items.length;
  const max = box.rows ? MAX_ROWS : MAX_CHIPS;
  const empty = box.state === "ready" && count === 0;
  const items = all ? box.items : box.items.slice(0, max);
  const rows = all ? activities : activities.slice(0, max);
  return (
    <section
      ref={ref}
      className={s.box}
      style={{ ["--kc" as string]: color }}
      data-box={box.id}
      data-locked={!box.editable}
      data-empty={empty}
      data-missing={box.missing}
      aria-labelledby={titleId}
    >
      <header className="flex items-start gap-2 px-3 pb-1 pt-2">
        <h3 id={titleId} className="text-[13px] font-semibold">
          {box.title}{" "}
          {count > 0 && <span className="font-normal tabular-nums text-muted-foreground">{count}</span>}
          {box.missing && <span className="sr-only"> (missing)</span>}
        </h3>
        <span className="ml-auto flex shrink-0 gap-1">
          {actions?.headerExtra?.(box, focus)}
          {box.open && box.open !== focus && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onOpen(box.open!)}>
              open ›
            </Button>
          )}
        </span>
      </header>
      <p className="mx-3 mb-2 text-xs text-muted-foreground">
        {!box.editable && <LockIcon className="mr-1" />}
        {box.title !== CONNECTION_KINDS[box.kind].name && (
          <b className="font-semibold" style={{ color }}>
            {CONNECTION_KINDS[box.kind].name}.{" "}
          </b>
        )}
        {box.explain}
        {box.through && <span className="block">{box.through}</span>}
      </p>

      {box.state !== "ready" ? (
        <div className="flex items-center gap-2 px-3 pb-3 text-xs text-muted-foreground" role={box.state === "error" ? "alert" : undefined}>
          {box.state === "loading" && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 motion-safe:animate-spin" />}
          {box.state === "unavailable" && <LockIcon />}
          <span>{box.stateText}</span>
        </div>
      ) : empty ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3 text-xs text-muted-foreground">
          <span>{box.empty}</span>
          {actions?.emptyExtra?.(box, focus)}
        </div>
      ) : box.rows ? (
        <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
          {rows.map((r) => (
            <ActivityRowView key={r.activityId} row={r} graph={graph} showForms={focus.startsWith("family:")} />
          ))}
          {activities.length > rows.length && (
            <ShowAll n={activities.length} onClick={() => setAll(true)} />
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5" dir={box.kind === "letters" && focus.startsWith("word:") ? "rtl" : undefined}>
          {items.map((it) => (
            <span key={it.key} className="relative inline-flex max-w-full">
              <NodeChip graph={graph} itemKey={it.key} onOpen={onOpen} head={it.head} tag={it.tag} flags={it.flags} />
              {actions?.itemExtra?.(box, it, focus)}
            </span>
          ))}
          {box.items.length > items.length && <ShowAll n={box.items.length} onClick={() => setAll(true)} />}
        </div>
      )}
    </section>
  );
});

function ShowAll({ n, onClick }: { n: number; onClick: () => void }) {
  return (
    <button type="button" className="rounded px-1.5 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" style={{ color: "var(--k-word)" }} onClick={onClick}>
      Show all {n}
    </button>
  );
}
