"use client";

/** The rail (CW-1): Everything, the registered kinds with counts, Views. Hidden under 1100 px. */

import * as React from "react";
import { AlertTriangle, History, Inbox, Layers, Shapes, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GATE_TAG,
  GATE_TEXT,
  KIND_META,
  VIEW_META,
  canDecide,
  type InboxCounts,
  type InboxKind,
  type InboxView,
  type Lens,
  type ReviewRoles,
} from "@/lib/review/inbox";
import { KindDot } from "./parts";

const VIEW_ICONS: Record<InboxView, React.ElementType> = { "v-ai": Sparkles, "v-failed": AlertTriangle, "v-mine": History };

function RailButton({
  on,
  onClick,
  icon,
  label,
  count,
  hot = true,
  tag,
  tagTitle,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number | null;
  hot?: boolean;
  tag?: string;
  tagTitle?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-[13px] text-foreground/85 transition-colors hover:bg-muted motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on && "bg-primary/15 text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]",
      )}
    >
      {icon}
      <span>{label}</span>
      {tag && (
        <span title={tagTitle} className="rounded border border-dashed px-1 text-[10px] text-muted-foreground">
          {tag}
          <span className="sr-only">: {tagTitle}</span>
        </span>
      )}
      <span
        className={cn(
          "ms-auto text-xs tabular-nums text-muted-foreground",
          hot && count ? "font-semibold text-foreground" : undefined,
        )}
      >
        {count ?? ""}
      </span>
    </button>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-2.5 mb-1.5 mt-4 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground first:mt-0.5">
      {children}
    </h2>
  );
}

export function ReviewRail({
  lens,
  onLens,
  kinds,
  counts,
  viewCounts,
  roles,
  library,
}: {
  lens: Lens;
  onLens: (lens: Lens) => void;
  kinds: readonly InboxKind[];
  counts: InboxCounts;
  viewCounts: Partial<Record<InboxView, number>>;
  roles: ReviewRoles;
  /** CW-9: the Library lenses with their sizes (null until known). Absent, the group is not shown. */
  library?: { families: number | null; concepts: number | null };
}) {
  const decisionKinds = kinds.filter((k) => k !== "letter");
  const views = (Object.keys(VIEW_META) as InboxView[]).filter((v) => {
    const vk = VIEW_META[v].kinds;
    return !vk || vk.some((k) => kinds.includes(k));
  });
  const iconCls = "h-[15px] w-[15px] shrink-0 text-muted-foreground";
  return (
    <nav aria-label="Queues" className="hidden min-h-0 overflow-auto border-r bg-background px-2.5 pb-6 pt-3.5 min-[1100px]:block">
      <Heading>To decide</Heading>
      <RailButton on={lens === "all"} onClick={() => onLens("all")} icon={<Inbox className={iconCls} aria-hidden="true" />} label="Everything" count={counts.all} />
      <Heading>By kind</Heading>
      {decisionKinds.map((k) => {
        const gate = KIND_META[k].gate;
        const locked = gate !== "staff" && !canDecide(gate, roles);
        return (
          <RailButton
            key={k}
            on={lens === k}
            onClick={() => onLens(k)}
            icon={<KindDot kind={k} />}
            label={KIND_META[k].label}
            count={counts.byKind[k]}
            tag={locked ? GATE_TAG[gate] : undefined}
            tagTitle={locked ? `Decisions need ${GATE_TEXT[gate]}` : undefined}
          />
        );
      })}
      {kinds.includes("letter") && (
        <>
          <Heading>Listen</Heading>
          <RailButton on={lens === "letter"} onClick={() => onLens("letter")} icon={<KindDot kind="letter" />} label={KIND_META.letter.label} count={counts.byKind.letter} hot={false} />
        </>
      )}
      {library && (
        <>
          <Heading>Library</Heading>
          <RailButton on={lens === "lib-families"} onClick={() => onLens("lib-families")} icon={<Layers className={iconCls} aria-hidden="true" />} label="Families" count={library.families} hot={false} />
          <RailButton on={lens === "lib-concepts"} onClick={() => onLens("lib-concepts")} icon={<Shapes className={iconCls} aria-hidden="true" />} label="Concepts" count={library.concepts} hot={false} />
        </>
      )}
      <Heading>Views</Heading>
      {views.map((v) => {
        const Icon = VIEW_ICONS[v];
        return (
          <RailButton
            key={v}
            on={lens === v}
            onClick={() => onLens(v)}
            icon={<Icon className={iconCls} aria-hidden="true" />}
            label={VIEW_META[v].label}
            count={viewCounts[v] ?? null}
            hot={false}
          />
        );
      })}
      <p className="mx-2.5 mt-4 text-[11.5px] leading-normal text-muted-foreground">
        Counts are what waits for a person. Approved, rejected and noted items stay one keystroke away under{" "}
        <b className="font-semibold">Decided</b>.
      </p>
    </nav>
  );
}
