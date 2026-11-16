"use client";

/**
 * The inbox list (CW-1, CW-4): search, the kind select (under 1100 px), status,
 * sort, the open lens's tools, per-source errors, and the rows as a listbox.
 */

import * as React from "react";
import { AlertTriangle, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canBulk } from "@/lib/review/bulk";
import {
  KIND_META,
  SORTS,
  STATUS_FILTERS,
  VIEW_META,
  isKindLens,
  needsDecision,
  shortAge,
  statusPill,
  type InboxCounts,
  type InboxItem,
  type InboxKind,
  type InboxView,
  type Lens,
  type ReviewRoles,
  type SortKey,
  type StatusFilter,
} from "@/lib/review/inbox";
import type { SourceState } from "@/lib/hooks/useReviewInbox";
import { Ar, Kbd, KindDot, SkeletonBar, StatusPill } from "./parts";
import { LENSES } from "./lenses";
import styles from "./review.module.css";

export const rowId = (key: string) => `review-row-${key.replace(/[^A-Za-z0-9_-]/g, "_")}`;

function lensName(lens: Lens): string {
  if (lens === "all") return "";
  if (isKindLens(lens)) return KIND_META[lens].label.toLowerCase();
  if (lens in VIEW_META) return VIEW_META[lens as InboxView].label.toLowerCase();
  return "this view";
}

/** CW-10: a bulk-safe row's checkbox; "space" keeps the column for the rows beside it. */
type RowCheck = "none" | "space" | { checked: boolean; onToggle: () => void };

function Row({
  item,
  selected,
  roles,
  now,
  onSelect,
  check = "none",
}: {
  item: InboxItem;
  selected: boolean;
  roles: ReviewRoles;
  now: number;
  onSelect: () => void;
  check?: RowCheck;
}) {
  const waiting = needsDecision(item) ? shortAge(item.waitingSince, now) : "";
  const box = typeof check === "object" ? check : null;
  return (
    <div
      id={rowId(item.key)}
      role="option"
      aria-selected={selected}
      aria-checked={box ? box.checked : undefined}
      onClick={onSelect}
      className={cn(
        "relative grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 border-b border-border/70 py-2.5 pe-3 ps-3.5 hover:bg-muted/50",
        check !== "none" && "ps-10",
        selected && "bg-primary/10 before:absolute before:inset-y-0 before:start-0 before:w-[3px] before:bg-primary",
        !needsDecision(item) && item.kind !== "letter" && "opacity-[0.62]",
      )}
    >
      {box && (
        <span
          aria-hidden="true"
          title="Select for bulk approve (x)"
          onClick={(e) => {
            e.stopPropagation();
            box.onToggle();
          }}
          className={cn(
            "absolute start-3 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded border border-input bg-background hover:border-primary",
            box.checked && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {box.checked && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2.5">
        {item.titleScript === "ar" ? (
          <Ar className={cn(styles.rowTitle, "min-w-0 flex-1 text-[23px] leading-[1.6]")}>{item.title}</Ar>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
        )}
        <StatusPill pill={statusPill(item, roles)} />
      </div>
      <div className="col-span-2 flex min-w-0 items-center gap-2 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <KindDot kind={item.kind} />
          {KIND_META[item.kind].one}
        </span>
        <span className="truncate">{item.context}</span>
        {waiting && <span className="ms-auto whitespace-nowrap">{waiting}</span>}
      </div>
    </div>
  );
}

export interface ReviewListProps {
  lens: Lens;
  onLens: (lens: Lens) => void;
  kinds: readonly InboxKind[];
  counts: InboxCounts;
  status: StatusFilter;
  onStatus: (s: StatusFilter) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  q: string;
  onQ: (q: string) => void;
  visible: InboxItem[];
  decided: number;
  loading: boolean;
  sources: SourceState[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  roles: ReviewRoles;
  now: number;
  updatedAt: number;
  onRefresh: () => void;
  searchRef: React.RefObject<HTMLInputElement>;
  listboxRef: React.RefObject<HTMLDivElement>;
  hidden: boolean;
  /** CW-10: the checked rows and their toggle; rows get a checkbox only where bulk is safe. */
  checked?: ReadonlySet<string>;
  onToggleCheck?: (item: InboxItem) => void;
  /** CW-10: the selection, progress and report strip above the rows. */
  bulkBar?: React.ReactNode;
}

export function ReviewList(p: ReviewListProps) {
  const Tools = isKindLens(p.lens) ? LENSES.get(p.lens)?.ListTools : undefined;
  const failed = p.sources.filter((s) => s.status === "error");
  const updated = p.updatedAt ? shortAge(new Date(p.updatedAt).toISOString(), p.now) : "";
  const name = lensName(p.lens);
  const checkable = !!p.onToggleCheck && p.visible.some((it) => canBulk(it, p.roles));
  const rowCheck = (it: InboxItem): RowCheck =>
    !checkable ? "none" : canBulk(it, p.roles) ? { checked: !!p.checked?.has(it.key), onToggle: () => p.onToggleCheck?.(it) } : "space";

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "Home" && p.visible[0]) {
      e.preventDefault();
      p.onSelect(p.visible[0].key);
    }
    if (e.key === "End" && p.visible.length) {
      e.preventDefault();
      p.onSelect(p.visible[p.visible.length - 1].key);
    }
  };

  let body: React.ReactNode;
  if (p.loading && p.visible.length === 0) {
    body = Array.from({ length: 7 }, (_, i) => (
      <div key={i} className="grid gap-2 border-b border-border/70 p-3" aria-hidden="true">
        <SkeletonBar className="ms-auto h-[18px]" style={{ width: `${40 + ((i * 13) % 45)}%` }} />
        <SkeletonBar style={{ width: `${55 + ((i * 7) % 30)}%` }} />
      </div>
    ));
  } else if (p.visible.length === 0) {
    body = p.q ? (
      <div className="grid place-items-center gap-2 px-6 py-12 text-center text-muted-foreground">
        <h3 className="text-[15px] font-semibold text-foreground">No match for &ldquo;{p.q}&rdquo;</h3>
        <p className="max-w-[380px]">Search looks at the Arabic with and without harakat, the English and the ids.</p>
        <Button variant="outline" size="sm" onClick={() => p.onQ("")}>
          Clear search
        </Button>
      </div>
    ) : p.status === "todo" ? (
      <div className="grid place-items-center gap-2 px-6 py-12 text-center text-muted-foreground">
        <div className="grid h-14 w-14 place-items-center rounded-full border">
          <Check className="h-6 w-6 text-secondary" aria-hidden="true" />
        </div>
        <h3 className="mt-1.5 text-[15px] font-semibold text-foreground">Nothing waits{name ? ` in ${name}` : ""}</h3>
        <p className="max-w-[380px]">
          {p.decided} decided so far. New items arrive when authors save words, phrases or activities, and when the AI drafts.
        </p>
        <Button variant="outline" size="sm" onClick={() => p.onStatus("done")}>
          See what was decided
        </Button>
      </div>
    ) : (
      <div className="grid place-items-center px-6 py-12 text-muted-foreground">
        <h3 className="text-[15px] font-semibold text-foreground">Nothing here yet</h3>
      </div>
    );
  }

  return (
    <section
      aria-label="Inbox"
      className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden border-r bg-background", p.hidden && "max-[859px]:hidden")}
    >
      <div className="grid gap-2 border-b px-3 pb-2 pt-3">
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={p.searchRef}
            type="search"
            value={p.q}
            onChange={(e) => p.onQ(e.target.value)}
            placeholder="Search Arabic, English or id"
            aria-label="Search"
            autoComplete="off"
            dir="auto"
            className="h-9 w-full rounded-md border border-input bg-background pe-9 ps-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Kbd className="absolute end-2 top-1/2 -translate-y-1/2">/</Kbd>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <select
            aria-label="Kind"
            value={p.lens}
            onChange={(e) => p.onLens(e.target.value as Lens)}
            className="h-[30px] w-full rounded-md border bg-background px-1.5 text-xs min-[1100px]:hidden"
          >
            <option value="all">Everything{p.counts.all ? ` (${p.counts.all})` : ""}</option>
            {p.kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
                {p.counts.byKind[k] ? ` (${p.counts.byKind[k]})` : ""}
              </option>
            ))}
            {p.kinds.includes("spelling") && <option value="v-check">{VIEW_META["v-check"].label}</option>}
            <option value="v-mine">{VIEW_META["v-mine"].label}</option>
            <option value="lib-families">Families</option>
            <option value="lib-concepts">Concepts</option>
          </select>
          <div role="tablist" aria-label="Status" className="inline-flex gap-0.5 rounded-md border p-0.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={p.status === s.value}
                onClick={() => p.onStatus(s.value)}
                className={cn(
                  "whitespace-nowrap rounded px-2.5 py-[3px] text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  p.status === s.value && "bg-muted font-medium text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Sort"
            value={p.sort}
            onChange={(e) => p.onSort(e.target.value as SortKey)}
            className="ms-auto h-[30px] rounded-md border bg-background px-1.5 text-xs"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {Tools && <Tools items={p.visible} />}
        <div className="flex flex-wrap justify-between gap-1 px-0.5 text-[11.5px] text-muted-foreground">
          <span>
            {p.loading && p.visible.length === 0 ? "Loading..." : `${p.visible.length} shown`}
            {updated && (
              <>
                {" · "}
                <button type="button" onClick={p.onRefresh} className="text-primary hover:underline" title="Read every source again">
                  updated {updated === "just now" ? updated : `${updated} ago`}
                </button>
              </>
            )}
          </span>
          <span aria-hidden="true">
            <Kbd>j</Kbd> <Kbd>k</Kbd> move{checkable && <> · <Kbd>x</Kbd> select</>} · <Kbd>?</Kbd> keys
          </span>
        </div>
      </div>
      {p.bulkBar}
      {failed.map((s) => (
        <div
          key={s.id}
          role="alert"
          className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs"
        >
          <AlertTriangle className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {s.label} could not be loaded: {s.error}. Everything else is current.
          </span>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={s.retry}>
            Retry
          </Button>
        </div>
      ))}
      {p.visible.length > 0 ? (
        <div
          ref={p.listboxRef}
          role="listbox"
          aria-label="Items"
          tabIndex={0}
          aria-activedescendant={p.selectedKey && p.visible.some((i) => i.key === p.selectedKey) ? rowId(p.selectedKey) : undefined}
          onKeyDown={onListKey}
          className="min-h-0 flex-1 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {p.visible.map((it) => (
            <Row
              key={it.key}
              item={it}
              selected={it.key === p.selectedKey}
              roles={p.roles}
              now={p.now}
              onSelect={() => p.onSelect(it.key)}
              check={rowCheck(it)}
            />
          ))}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto" aria-busy={p.loading || undefined}>
          {body}
        </div>
      )}
    </section>
  );
}
