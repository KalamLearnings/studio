"use client";

/**
 * The Words page (CG-1): search, the gaps rail, and either the focus frame
 * around one item or "All words". The URL holds `?focus=<type>:<id>&view=all`;
 * every move pushes a history entry, so Back retraces the trail.
 * Connecting (CG-5) plugs in through `extension.ts`: `editing/ConnectEditing`
 * fills it for a curriculum lead or a phrase reviewer; everyone else reads.
 */

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ConnectAccess } from "@/lib/connections/access";
import { allWords, gaps } from "@/lib/connections/gaps";
import { NODE_KINDS } from "@/lib/connections/kinds";
import {
  nextTrail,
  parseWordsUrl,
  previousOnTrail,
  typeOfKey,
  wordsUrlSearch,
  type NodeKey,
  type WordsUrlState,
  type WordsView,
} from "@/lib/connections/keys";
import { existsInGraph, neighbourhood, usageUnitsFor } from "@/lib/connections/neighbourhood";
import { searchIndex } from "@/lib/connections/search";
import { useConnectionsGraph, useConnectionsUsage } from "@/lib/hooks/useConnections";
import { AllWords } from "./AllWords";
import { ConnectEditing } from "./editing/ConnectEditing";
import { FocusFrame } from "./FocusFrame";
import { GapsRail } from "./GapsRail";
import { KindsDialog } from "./KindsDialog";
import { labelOf } from "./parts";
import { SearchBox, type SearchBoxHandle } from "./SearchBox";
import { useConnectionsSource } from "./SourceContext";
import { Trail } from "./Trail";
import s from "./words.module.css";

const isTyping = (el: Element | null) =>
  !!el && (/^(input|textarea|select)$/i.test(el.tagName) || (el as HTMLElement).isContentEditable);

export function WordsPage({ access }: { access: ConnectAccess | null }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const { focus, view } = parseWordsUrl(params);
  const source = useConnectionsSource();
  const { graph, loading, error, refetch } = useConnectionsGraph(source);

  const searchRef = React.useRef<SearchBoxHandle>(null);
  const cardRef = React.useRef<HTMLElement>(null);
  const canvasRef = React.useRef<HTMLElement>(null);
  const moved = React.useRef(false);
  const [trail, setTrail] = React.useState<NodeKey[]>(() => (focus ? [focus] : []));
  const [announce, setAnnounce] = React.useState("");

  // ---- URL and trail ----------------------------------------------------------------
  const go = React.useCallback(
    (next: WordsUrlState) => {
      moved.current = true;
      window.history.pushState(null, "", `${pathname}${wordsUrlSearch(next)}`);
    },
    [pathname],
  );
  const open = React.useCallback((key: NodeKey) => go({ focus: key, view: "focus" }), [go]);
  const setView = (v: WordsView) => go({ focus, view: v });

  // The trail follows the focus, whether a click or the browser's Back moved it.
  React.useEffect(() => {
    if (focus) setTrail((t) => nextTrail(t, focus));
  }, [focus]);

  // After a move made here: keyboard focus to the new item, the canvas to the top, and say what opened.
  React.useEffect(() => {
    if (!moved.current || !graph) return;
    moved.current = false;
    canvasRef.current?.scrollTo({ top: 0 });
    if (view === "focus" && focus && existsInGraph(graph, focus)) {
      cardRef.current?.focus({ preventScroll: true });
      const L = labelOf(graph, focus);
      setAnnounce(`${NODE_KINDS[typeOfKey(focus)].name} ${[L.ar, L.en].filter(Boolean).join(" ")} in focus`);
    } else if (view === "all") {
      setAnnounce("All words");
    }
  }, [focus, view, graph]);

  // ---- keys: "/" to search, Backspace or Alt+Left back along the trail ----------------
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTyping(document.activeElement) || document.querySelector("[role=dialog]")) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if ((e.key === "Backspace" && !e.altKey && !e.metaKey && !e.ctrlKey) || (e.key === "ArrowLeft" && e.altKey)) {
        const prev = view === "focus" ? previousOnTrail(trail, focus) : null;
        if (prev) {
          e.preventDefault();
          open(prev);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trail, focus, view, open]);

  // ---- data -------------------------------------------------------------------------
  const index = React.useMemo(() => (graph ? searchIndex(graph) : []), [graph]);
  const gapList = React.useMemo(() => (graph ? gaps(graph) : []), [graph]);
  const all = React.useMemo(() => (graph && view === "all" ? allWords(graph) : null), [graph, view]);
  const units = React.useMemo(
    () => (graph && focus && view === "focus" ? usageUnitsFor(graph, focus) : []),
    [graph, focus, view],
  );
  const usage = useConnectionsUsage(source, units);
  const known = !!(graph && focus && existsInGraph(graph, focus));
  const hood = graph && focus && known && view === "focus" ? neighbourhood(graph, focus, usage) : null;

  return (
    <div className={cn(s.tokens, s.root)}>
      <div className={s.top}>
        <h1 className="mr-2 text-base font-semibold">Words</h1>
        <SearchBox ref={searchRef} graph={graph} index={index} onOpen={open} />
        <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-lg border">
          {(["focus", "all"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              disabled={v === "focus" && !focus}
              title={v === "focus" && !focus ? "Open a word first" : undefined}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-sm focus-visible:relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
                view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "focus" ? "Focus" : "All words"}
            </button>
          ))}
        </div>
        <KindsDialog />
        {access && !access.canConnect && (
          <p className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="read-only">
            <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {access.reason}
          </p>
        )}
      </div>

      <div className={s.body}>
        <GapsRail graph={graph} gaps={gapList} focus={view === "focus" ? focus : null} onOpen={open} />
        <main ref={canvasRef} className={s.canvas} aria-label={view === "all" ? "All words" : "The item and its connections"}>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" /> Loading the word bank...
            </div>
          )}
          {error && !graph && (
            <div role="alert" className="mx-auto max-w-md rounded-lg border border-destructive/50 p-4 text-center text-sm">
              <p>The word bank could not be loaded. {error.message}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}
          {graph && view === "focus" && (
            <>
              <Trail graph={graph} trail={trail} focus={focus} onOpen={open} />
              {hood ? (
                access?.canConnect ? (
                  <ConnectEditing graph={graph}>
                    <FocusFrame graph={graph} hood={hood} onOpen={open} cardRef={cardRef} />
                  </ConnectEditing>
                ) : (
                  <FocusFrame graph={graph} hood={hood} onOpen={open} cardRef={cardRef} />
                )
              ) : (
                <div className="mx-auto max-w-md py-12 text-center text-sm text-muted-foreground">
                  <p>{focus && typeOfKey(focus) === "activity" ? "Lesson activities open in the lesson builder." : "That item is not in the word bank any more."}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => go({ focus: null, view: "all" })}>
                    Show all words
                  </Button>
                </div>
              )}
            </>
          )}
          {graph && all && <AllWords graph={graph} data={all} onOpen={open} />}
        </main>
      </div>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
}
