"use client";

/**
 * The Review workspace (CW-1, CW-4): rail, inbox list and decision pane, with
 * the state in the URL, the keyboard layer and focus management. Layout:
 * three columns from 1100 px (rail 196 to 228 px, list 300 to 400 px), two
 * from 860 px (a kind select replaces the rail), and master and detail below
 * that with a Back link.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReviewInbox } from "@/lib/hooks/useReviewInbox";
import type { DecisionSpec } from "@/lib/review/actions/types";
import {
  INBOX_KINDS,
  decidedCount,
  inLens,
  isKindLens,
  moveSelection,
  nextAfterDecision,
  nextStatus,
  visibleItems,
  waitingSummary,
  type InboxView,
  type Lens,
  type LensContext,
  type SortKey,
  type StatusFilter,
} from "@/lib/review/inbox";
import { BASE_SHORTCUTS, commandForKey, isTypingTarget, mergeShortcuts } from "@/lib/review/keyboard";
import { reviewUrlSearch, type ReviewUrlState } from "@/lib/review/url";
import { useReviewCountStore } from "@/lib/stores/reviewCountStore";
import { PaneCommandContext } from "./commands";
import { HeaderSlot } from "./HeaderSlot";
import { LENSES, REGISTERED_KINDS } from "./lenses";
import type { CommandHandler } from "./lenses/types";
import { BackToListContext } from "./PaneFrame";
import { Kbd, SkeletonBar } from "./parts";
import { ReviewList } from "./ReviewList";
import { ReviewRail } from "./ReviewRail";
import { ShortcutSheet } from "./ShortcutSheet";
import styles from "./review.module.css";

/** A lens from the URL that this build cannot show (a kind with no pane yet, a library list) opens Everything. */
function usableLens(lens: Lens): Lens {
  if (isKindLens(lens)) return REGISTERED_KINDS.includes(lens) ? lens : "all";
  if (lens === "lib-families" || lens === "lib-concepts") return "all";
  return lens;
}

const SHORTCUTS = mergeShortcuts(
  BASE_SHORTCUTS,
  REGISTERED_KINDS.flatMap((k) => LENSES.get(k)?.shortcuts ?? []),
);

export function ReviewWorkspace({
  initial,
  useInbox = useReviewInbox,
}: {
  initial: ReviewUrlState;
  /** The inbox source; a preview or a test passes a stand-in with the same shape. */
  useInbox?: typeof useReviewInbox;
}) {
  const router = useRouter();
  const inbox = useInbox(REGISTERED_KINDS);
  const setBadge = useReviewCountStore((s) => s.setCount);

  const [lens, setLensState] = React.useState<Lens>(() => usableLens(initial.lens));
  const [status, setStatus] = React.useState<StatusFilter>(initial.status);
  const [sort, setSort] = React.useState<SortKey>(initial.sort);
  const [q, setQ] = React.useState(initial.q);
  const [selected, setSelected] = React.useState<string | null>(initial.item);
  const [showDetail, setShowDetail] = React.useState(!!initial.item);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());

  const searchRef = React.useRef<HTMLInputElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const paneHandler = React.useRef<CommandHandler | null>(null);

  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // ---- URL state ------------------------------------------------------------------
  React.useEffect(() => {
    const search = reviewUrlSearch({ lens, status, sort, q, item: selected, family: null, concept: null });
    if (window.location.search !== search) window.history.replaceState(null, "", `/review${search}`);
  }, [lens, status, sort, q, selected]);

  // ---- the list ---------------------------------------------------------------------
  const lensCtx = React.useMemo<LensContext>(
    () => ({ userId: inbox.userId, decidedHere: inbox.session.decidedHere }),
    [inbox.userId, inbox.session.decidedHere],
  );
  const visible = React.useMemo(
    () => visibleItems(inbox.items, { lens, status, sort, q }, lensCtx),
    [inbox.items, lens, status, sort, q, lensCtx],
  );
  const visibleRef = React.useRef(visible);
  visibleRef.current = visible;
  const current = React.useMemo(() => inbox.items.find((i) => i.key === selected) ?? null, [inbox.items, selected]);

  const viewCounts = React.useMemo<Partial<Record<InboxView, number>>>(
    () => ({
      "v-mine": inbox.items.filter((i) => inLens(i, "v-mine", "all", lensCtx)).length,
      "v-failed": inbox.items.filter((i) => inLens(i, "v-failed", "all", lensCtx)).length,
    }),
    [inbox.items, lensCtx],
  );

  // First load, or a deep link to an item that no longer exists: open the first row.
  React.useEffect(() => {
    if (inbox.loading) return;
    if (selected && inbox.items.some((i) => i.key === selected)) return;
    if (selected && inbox.sources.some((s) => s.status === "loading")) return;
    setSelected(visible[0]?.key ?? null);
  }, [inbox.loading, inbox.items, inbox.sources, selected, visible]);

  React.useEffect(() => {
    if (!inbox.loading) setBadge(inbox.counts.all);
  }, [inbox.loading, inbox.counts.all, setBadge]);

  // ---- selection and focus ------------------------------------------------------------
  const focusList = React.useCallback(() => {
    // After the selection moves the old pane unmounts; focus goes back to the list, never to the page body.
    requestAnimationFrame(() => listboxRef.current?.focus({ preventScroll: true }));
  }, []);

  const select = React.useCallback(
    (key: string | null, opts: { focus?: boolean } = {}) => {
      setSelected(key);
      if (key) setShowDetail(true);
      if (opts.focus) focusList();
    },
    [focusList],
  );

  React.useEffect(() => {
    if (!selected) return;
    const el = document.getElementById(`review-row-${selected.replace(/[^A-Za-z0-9_-]/g, "_")}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const setLens = React.useCallback(
    (next: Lens) => {
      const l = usableLens(next);
      setLensState(l);
      const list = visibleItems(inbox.items, { lens: l, status, sort, q }, lensCtx);
      if (!list.some((i) => i.key === selected)) setSelected(list[0]?.key ?? null);
    },
    [inbox.items, status, sort, q, lensCtx, selected],
  );

  // ---- decisions ------------------------------------------------------------------
  const decide = React.useCallback(
    (spec: DecisionSpec) => {
      const before = visibleRef.current;
      inbox.decide(spec);
      if (spec.advance !== false) select(nextAfterDecision(before, spec.item.key), { focus: true });
    },
    [inbox, select],
  );

  const openFamily = React.useCallback((_familyId: string | null) => router.push("/families"), [router]);
  const openConcept = React.useCallback(
    (slug: string | null) => router.push(slug ? `/concepts?concept=${encodeURIComponent(slug)}` : "/concepts"),
    [router],
  );

  // ---- keyboard -----------------------------------------------------------------------
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      // Another dialog (a picker, a confirm) owns its keys.
      if (target?.closest?.('[role="dialog"],[role="alertdialog"]')) return;
      const typing = isTypingTarget(target);
      const cmd = commandForKey(e, { typing });
      if (!cmd) return;
      if (paneHandler.current?.(cmd)) {
        e.preventDefault();
        return;
      }
      switch (cmd.type) {
        case "next":
        case "prev":
          e.preventDefault();
          select(moveSelection(visibleRef.current, selected, cmd.type === "next" ? 1 : -1), { focus: true });
          return;
        case "search":
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
          return;
        case "cycleStatus":
          setStatus((s) => nextStatus(s));
          return;
        case "digit": {
          const kind = cmd.n === 0 ? "all" : INBOX_KINDS[cmd.n - 1];
          if (kind === "all" || (kind && REGISTERED_KINDS.includes(kind))) setLens(kind);
          return;
        }
        case "undo":
          inbox.undo();
          return;
        case "help":
          e.preventDefault();
          setSheetOpen(true);
          return;
        case "escape":
          if (typing) target?.blur();
          else if (showDetail) setShowDetail(false);
          return;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, selected, select, setLens, inbox, showDetail]);

  // ---- render -------------------------------------------------------------------------
  const Pane = current ? LENSES.get(current.kind)?.Pane : undefined;
  const roleLabel = inbox.roles.curriculumLead
    ? "Curriculum lead"
    : inbox.roles.phraseReviewer
      ? "Staff, phrase reviewer"
      : "Staff";
  const decided = decidedCount(inbox.items, lens, lensCtx);

  let pane: React.ReactNode;
  if (current && Pane) {
    pane = (
      <Pane
        key={current.key}
        item={current}
        roles={inbox.roles}
        userId={inbox.userId}
        bank={inbox.bank}
        wordCache={inbox.wordCache}
        decide={decide}
        error={inbox.session.errors[current.key] ?? null}
        clearError={() => inbox.clearError(current.key)}
        busy={inbox.session.busy[current.key] ?? null}
        openFamily={openFamily}
        openConcept={openConcept}
        now={now}
      />
    );
  } else if (inbox.loading) {
    pane = (
      <div className="min-h-0 flex-1 overflow-auto" aria-busy="true">
        <div className={cn(styles.inner, styles.single)}>
          <div className="grid gap-2 rounded-xl border bg-card p-5">
            <SkeletonBar className="w-[30%]" />
            <SkeletonBar className="ms-auto h-11 w-1/2" />
            <SkeletonBar className="w-[70%]" />
          </div>
        </div>
      </div>
    );
  } else {
    const any = visible.length > 0;
    pane = (
      <div className="grid min-h-0 flex-1 place-items-center content-center gap-2 p-12 text-center text-muted-foreground">
        <div className="grid h-14 w-14 place-items-center rounded-full border">
          <Inbox className="h-6 w-6 text-secondary" aria-hidden="true" />
        </div>
        <h2 className="mt-1.5 text-[15px] font-semibold text-foreground">{any ? "Pick an item" : "All clear"}</h2>
        <p className="max-w-[380px]">
          {any ? (
            <>
              Press <Kbd>j</Kbd> to start with the first one.
            </>
          ) : (
            "Nothing in this view needs you right now."
          )}
        </p>
      </div>
    );
  }

  return (
    <PaneCommandContext.Provider value={paneHandler}>
      <BackToListContext.Provider value={() => setShowDetail(false)}>
        <HeaderSlot>
          <h1 className="text-xl font-semibold">Review</h1>
          <span className="hidden truncate text-[12.5px] text-muted-foreground min-[1100px]:inline" aria-live="polite">
            {inbox.loading ? "Loading every queue..." : waitingSummary(inbox.counts)}
          </span>
          <span className="hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground min-[860px]:inline">
            {roleLabel}
          </span>
        </HeaderSlot>
        <div
          className={cn(
            "grid h-full min-h-0 grid-cols-1 bg-muted/30",
            "min-[860px]:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]",
            "min-[1100px]:grid-cols-[196px_minmax(300px,360px)_minmax(0,1fr)]",
            "min-[1280px]:grid-cols-[204px_minmax(320px,372px)_minmax(0,1fr)]",
            "min-[1500px]:grid-cols-[228px_minmax(340px,400px)_minmax(0,1fr)]",
          )}
        >
          <ReviewRail lens={lens} onLens={setLens} kinds={REGISTERED_KINDS} counts={inbox.counts} viewCounts={viewCounts} roles={inbox.roles} />
          <ReviewList
            lens={lens}
            onLens={setLens}
            kinds={REGISTERED_KINDS}
            counts={inbox.counts}
            status={status}
            onStatus={setStatus}
            sort={sort}
            onSort={setSort}
            q={q}
            onQ={setQ}
            visible={visible}
            decided={decided}
            loading={inbox.loading}
            sources={inbox.sources}
            selectedKey={selected}
            onSelect={(key) => select(key, { focus: true })}
            roles={inbox.roles}
            now={now}
            updatedAt={inbox.updatedAt}
            onRefresh={inbox.refetchAll}
            searchRef={searchRef}
            listboxRef={listboxRef}
            hidden={showDetail && !!current}
          />
          <section
            aria-label="Decision"
            className={cn(styles.pane, "flex min-h-0 min-w-0 flex-col", !(showDetail && current) && "max-[859px]:hidden")}
          >
            {pane}
          </section>
        </div>
        <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} groups={SHORTCUTS} />
      </BackToListContext.Provider>
    </PaneCommandContext.Provider>
  );
}
