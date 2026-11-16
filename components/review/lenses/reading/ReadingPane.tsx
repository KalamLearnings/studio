"use client";

/**
 * The Reading pane (CW-5): an unvowelled live spelling with no reads-as.
 * `1`-`9` pick the fully vowelled spelling it is read as, `a` confirms.
 */

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearReading, confirmReading } from "@/lib/review/actions/words";
import type { ReadingItem } from "@/lib/review/normalise/words";
import { usePaneCommands } from "../../commands";
import { ConceptCard, useFamilyConcept } from "../../context/ConceptCard";
import { FamilyCard } from "../../context/FamilyCard";
import { UsageCard } from "../../context/UsageCard";
import { DecisionBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { Ar, KBD_ON_BUTTON, Kbd, PaneCard, Say, StatusPill } from "../../parts";
import type { PaneProps } from "../types";

export function ReadingPane(props: PaneProps) {
  const { roles, userId, bank, wordCache, decide, error, clearError, busy, openFamily, openConcept, now } = props;
  const item = props.item as ReadingItem;
  const { word, candidates, readsAs } = item.data;
  const [picked, setPicked] = React.useState(0);
  const todo = item.state === "todo";
  const { concept } = useFamilyConcept(item.familyId);
  const choice = candidates[picked] ?? null;

  const confirm = () => {
    if (todo && choice) decide(confirmReading(item, choice, wordCache));
  };

  usePaneCommands((cmd) => {
    if (busy) return false;
    switch (cmd.type) {
      case "digit":
        if (!todo || cmd.n < 1 || !candidates[cmd.n - 1]) return false;
        setPicked(cmd.n - 1);
        return true;
      case "approve":
        if (!todo || !choice) return false;
        confirm();
        return true;
      case "openFamily":
        openFamily(item.familyId);
        return true;
      case "openConcept":
        openConcept(concept?.slug ?? null);
        return true;
      default:
        return false;
    }
  });

  const main = (
    <>
      <Hero item={item} roles={roles} userId={userId} now={now} sub="No harakat. The app needs to know how it is read before a child sees it.">
        <Say>
          Pick the fully vowelled spelling with the same letters. The server checks the letters, the family, and that the
          spelling you pick is not itself read as another one.
        </Say>
      </Hero>
      <PaneCard title="Read as">
        {!todo ? (
          <div className="flex items-center gap-2 text-xs">
            <Ar className="text-[22px] leading-[1.6]">{readsAs?.arabic ?? ""}</Ar>
            <span className="flex-1" />
            <StatusPill pill={{ tone: "ok", text: "Confirmed" }} />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">
            No fully vowelled spelling with these letters is in the library yet. Add it to the library first, then confirm.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Read as" className="grid gap-2.5">
            {candidates.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={i === picked}
                onClick={() => setPicked(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-[10px] border bg-background/60 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === picked && "border-primary/70 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
                )}
              >
                <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                  {i < 9 && <Kbd>{i + 1}</Kbd>}
                  <span className="font-mono font-normal text-muted-foreground">{c.id}</span>
                  {c.family_id && c.family_id === word.family_id && (
                    <span className="font-normal text-muted-foreground">same family</span>
                  )}
                </span>
                <Ar className="text-[26px] leading-[1.6]">{c.arabic}</Ar>
              </button>
            ))}
          </div>
        )}
      </PaneCard>
    </>
  );

  const context = (
    <>
      <FamilyCard familyId={item.familyId} currentWordId={word.id} bank={bank} onOpen={openFamily} />
      <ConceptCard familyId={item.familyId} onOpen={openConcept} />
      <UsageCard wordId={word.id} countLine={`${word.usage_count} ${word.usage_count === 1 ? "activity" : "activities"}`} />
    </>
  );

  const bar = todo ? (
    <DecisionBar
      busy={busy}
      error={error}
      onDismissError={clearError}
      status={
        candidates.length > 1 ? (
          <>
            Choose with <Kbd>1</Kbd>-<Kbd>{String(Math.min(candidates.length, 9))}</Kbd> <NextHint />
          </>
        ) : candidates.length === 1 ? (
          <NextHint />
        ) : (
          "Nothing to confirm yet."
        )
      }
      actions={
        candidates.length > 0 && (
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={confirm}>
            <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Confirm reading <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
          </Button>
        )
      }
    />
  ) : (
    <DecisionBar
      busy={busy}
      error={error}
      onDismissError={clearError}
      status="Confirmed."
      actions={
        <Button variant="outline" size="sm" onClick={() => decide(clearReading(item, wordCache))}>
          Clear reading
        </Button>
      }
    />
  );

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
