"use client";

/**
 * The word request pane (CW-7): a word the generator needed and the reviewed
 * library lacks. Fulfil (`a` opens the picker of reviewed, live, real words;
 * `1`-`9` or a click picks) or Decline (`r`, an optional reason, `enter`).
 * Both are held 5 s so Undo cancels them. Any staff member decides.
 */

import * as React from "react";
import { Check } from "lucide-react";
import { stripHarakat } from "@kalam/curriculum-schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fulfilingWords } from "@/lib/generation/drafts";
import { useDraftCache } from "@/lib/hooks/useReviewDraftPhraseSources";
import { declineRequestSpec, fulfilRequestSpec } from "@/lib/review/actions/drafts";
import { previewLetter } from "@/lib/review/draftPreview";
import { foldForSearch, shortAge } from "@/lib/review/inbox";
import type { BankWord } from "@/lib/review/normalise/words";
import type { RequestItem } from "@/lib/review/normalise/sources";
import { usePaneCommands } from "../../commands";
import { DecisionBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { Ar, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say } from "../../parts";
import type { PaneProps } from "../types";

type Mode = { type: "fulfil"; filter: string } | { type: "decline"; reason: string } | null;

const SHOWN = 40;

/** Reviewed, live, real words; those with every letter the request names first, then the most used. */
function candidates(words: readonly BankWord[], letters: string[], filter: string): BankWord[] {
  const pool = fulfilingWords(
    words.map((w) => ({ ...w, reviewed_at: w.reviewed_at ?? null, retired_at: w.retired_at ?? null, is_pseudo: !!w.is_pseudo })),
  );
  const q = foldForSearch(filter.trim());
  const fits = (w: BankWord) => {
    const bare = stripHarakat(w.arabic);
    return letters.every((l) => bare.includes(l));
  };
  return pool
    .filter((w) => !q || foldForSearch(`${w.arabic} ${w.english ?? ""} ${w.id}`).includes(q))
    .sort((a, b) => Number(fits(b)) - Number(fits(a)) || b.usage_count - a.usage_count)
    .slice(0, SHOWN);
}

export function RequestPane(props: PaneProps) {
  const { roles, userId, bank, decide, error, clearError, busy, now } = props;
  const item = props.item as RequestItem;
  const r = item.data;
  const cache = useDraftCache();
  const todo = item.state === "todo";
  const [mode, setMode] = React.useState<Mode>(null);
  const reasonRef = React.useRef<HTMLInputElement>(null);

  const letters = React.useMemo(() => r.letters.map(previewLetter).filter((l) => l !== null), [r.letters]);
  const bases = React.useMemo(() => letters.map((l) => l.base), [letters]);
  const list = React.useMemo(
    () => (mode?.type === "fulfil" ? candidates(bank.words, bases, mode.filter) : []),
    [mode, bank.words, bases],
  );

  const fulfil = (w: BankWord) => {
    setMode(null);
    decide(fulfilRequestSpec(item, w, cache));
  };
  const decline = () => {
    if (mode?.type !== "decline") return;
    const reason = mode.reason;
    setMode(null);
    decide(declineRequestSpec(item, reason, cache));
  };
  const startDecline = () => {
    setMode({ type: "decline", reason: "" });
    requestAnimationFrame(() => reasonRef.current?.focus());
  };

  usePaneCommands((cmd) => {
    if (busy && cmd.type !== "escape") return false;
    if (!todo) return false;
    switch (cmd.type) {
      case "approve":
        if (mode) return false;
        setMode({ type: "fulfil", filter: "" });
        return true;
      case "reject":
        if (mode) return false;
        startDecline();
        return true;
      case "digit":
        if (mode?.type !== "fulfil" || cmd.n < 1 || !list[cmd.n - 1]) return false;
        fulfil(list[cmd.n - 1]);
        return true;
      case "confirm":
        if (mode?.type === "decline") {
          decline();
          return true;
        }
        if (mode?.type === "fulfil" && list[0] && mode.filter) {
          fulfil(list[0]);
          return true;
        }
        return false;
      case "escape":
        if (!mode) return false;
        setMode(null);
        return true;
      default:
        return false;
    }
  });

  // `requestItems` names the node in the context line after the activity type.
  const nodeName = item.context.startsWith(`${r.activity_type} · `) ? item.context.slice(r.activity_type.length + 3) : r.node_id;
  const fulfilled = r.fulfilled_word_id ? bank.wordsById.get(r.fulfilled_word_id) : undefined;

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        big={<div className="w-full py-1.5 text-left text-[28px] font-semibold leading-tight">&ldquo;{item.title}&rdquo;</div>}
        sub={
          <>
            The generator needed this for <b className="font-medium text-foreground">{r.activity_type}</b> in{" "}
            {nodeName}
            {letters.length > 0 && (
              <>
                , letters{" "}
                {letters.map((l, i) => (
                  <Ar key={i} className="mx-0.5 text-base text-foreground">
                    {l.glyph}
                  </Ar>
                ))}
              </>
            )}
          </>
        }
      >
        <Say>Fulfil with a reviewed, live, real word, or decline.</Say>
      </Hero>

      {mode?.type === "fulfil" && (
        <PaneCard
          title="Pick the reviewed word"
          aside={<span className="text-xs font-normal text-muted-foreground">reviewed, not retired, not a drill</span>}
        >
          <input
            aria-label="Filter the words"
            placeholder="Filter: Arabic, English or id"
            dir="auto"
            value={mode.filter}
            onChange={(e) => setMode({ type: "fulfil", filter: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {list.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {bank.words.length === 0 ? "The word library is still loading." : "No reviewed word matches. Review one in Spellings first, or decline."}
            </p>
          ) : (
            <div role="listbox" aria-label="Reviewed words" className="mt-2 grid max-h-[300px] gap-1 overflow-auto">
              {list.map((w, i) => {
                const fits = bases.length > 0 && bases.every((b) => stripHarakat(w.arabic).includes(b));
                return (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => fulfil(w)}
                    className="flex items-center gap-2.5 rounded-md border bg-background px-2.5 py-1 text-left text-[12.5px] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {i < 9 ? <Kbd>{i + 1}</Kbd> : <span className="w-[18px]" />}
                    <Ar className="text-[22px] leading-[1.5]">{w.arabic}</Ar>
                    <span className="font-mono text-muted-foreground">{w.id}</span>
                    <span className="ms-auto text-muted-foreground">
                      {[fits ? "has the letters" : "", w.english ?? "", w.usage_count ? `used by ${w.usage_count}` : ""].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </PaneCard>
      )}

      {mode?.type === "decline" && (
        <PaneCard title="Decline">
          <input
            ref={reasonRef}
            aria-label="Reason (optional)"
            placeholder="Reason (optional)"
            value={mode.reason}
            maxLength={500}
            onChange={(e) => setMode({ type: "decline", reason: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </PaneCard>
      )}
    </>
  );

  const context = (
    <ContextCard title="Asked by">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-muted-foreground">Node</dt>
        <dd className="min-w-0 break-words">{nodeName}</dd>
        <dt className="text-muted-foreground">Activity</dt>
        <dd className="font-mono">{r.activity_type}</dd>
        <dt className="text-muted-foreground">Opened</dt>
        <dd>{shortAge(r.created_at, now)} ago</dd>
      </dl>
    </ContextCard>
  );

  let bar: React.ReactNode;
  if (!todo) {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={
          item.state === "approved" ? (
            <>
              Fulfilled{fulfilled ? <> with <Ar className="text-base text-foreground">{fulfilled.arabic}</Ar></> : ""}.
            </>
          ) : (
            `Declined${r.decline_reason ? `: ${r.decline_reason}` : "."}`
          )
        }
      />
    );
  } else if (mode?.type === "fulfil") {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status="Pick with a number or click."
        actions={
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
            Cancel <Kbd className="ms-2">esc</Kbd>
          </Button>
        }
      />
    );
  } else if (mode?.type === "decline") {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button variant="destructive" size="sm" onClick={decline}>
              Decline request <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
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
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={startDecline}>
              Decline <Kbd className="ms-2">r</Kbd>
            </Button>
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setMode({ type: "fulfil", filter: "" })}>
              <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Fulfil <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
            </Button>
          </>
        }
      />
    );
  }

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
