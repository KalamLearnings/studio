"use client";

/**
 * The Spelling pane (CW-5): one spelling of the word-bank review queue.
 * Approve (`a`), Not a real word (`p`), Wrong harakat (`h`, a correction with
 * the same letters: a note for a used word, a respelling for an unused one).
 * The Automatic check card (CM-AIPRE) shows what automatic checkers said; its
 * "Use this" only fills the Wrong harakat field, which the reviewer still saves.
 */

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveSpelling,
  clearSpellingNote,
  noteNotReal,
  noteWrongHarakat,
  respellSpelling,
  withdrawSpelling,
} from "@/lib/review/actions/words";
import { shortAge } from "@/lib/review/inbox";
import { CLASS_LABELS, sameLetterSpellings, type SpellingItem } from "@/lib/review/normalise/words";
import { FLAG_LABELS, validateNote } from "@/lib/words/review/queue";
import { usePaneCommands } from "../../commands";
import { ConceptCard, useFamilyConcept } from "../../context/ConceptCard";
import { FamilyCard } from "../../context/FamilyCard";
import { DecisionBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { Ar, Chip, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say } from "../../parts";
import type { PaneProps } from "../types";
import { sourceLabel } from "@/lib/review/wordChecks";
import { AutomaticCheckCard } from "./AutomaticCheckCard";

interface FixState {
  value: string;
  error: string | null;
  /** The automatic checker whose suggestion filled the field, if one did. */
  fromCheck?: string;
}

export function SpellingPane(props: PaneProps) {
  const { roles, userId, bank, wordCache, decide, error, clearError, busy, openFamily, openConcept, now } = props;
  const item = props.item as SpellingItem;
  const { row, note, queueSize, check } = item.data;
  const word = row.word;
  const unused = word.usage_count === 0;
  const [fix, setFix] = React.useState<FixState | null>(null);
  const fixRef = React.useRef<HTMLInputElement>(null);
  const todo = item.state === "todo";
  const { concept } = useFamilyConcept(item.familyId);

  React.useEffect(() => {
    if (fix && fixRef.current && document.activeElement !== fixRef.current) {
      fixRef.current.focus();
      fixRef.current.select();
    }
    // Focus once when the field opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix !== null]);

  const approve = () => todo && decide(approveSpelling(item, wordCache));
  const notReal = () => todo && decide(noteNotReal(item, wordCache));
  const openFix = () => todo && setFix({ value: word.arabic, error: null });
  // A suggestion only fills the field; nothing is saved until the reviewer saves it.
  const useSuggestion = (suggested: string, source: string) =>
    todo && setFix({ value: suggested, error: null, fromCheck: source });
  const saveFix = () => {
    if (!fix) return;
    const corrected = fix.value.trim();
    const problem = validateNote(row, { decision: "wrong", correctedSpelling: corrected });
    if (problem) return setFix({ ...fix, error: problem });
    setFix(null);
    decide(unused ? respellSpelling(item, corrected, wordCache) : noteWrongHarakat(item, corrected, wordCache));
  };

  usePaneCommands((cmd) => {
    if (busy && cmd.type !== "escape") return false;
    switch (cmd.type) {
      case "approve":
        if (fix || !todo) return false;
        approve();
        return true;
      case "notReal":
        if (fix || !todo) return false;
        notReal();
        return true;
      case "fixHarakat":
        if (!todo) return false;
        openFix();
        return true;
      case "confirm":
        if (!fix) return false;
        saveFix();
        return true;
      case "escape":
        if (!fix) return false;
        setFix(null);
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

  const others = sameLetterSpellings(word, bank.words);
  const base = row.reason?.startsWith("base: ") ? row.reason.slice(6) : null;

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        sub={
          <>
            <b className="font-medium text-foreground">{CLASS_LABELS[row.class] ?? row.class}</b> · rank {row.rank} of {queueSize} by use
            {base && (
              <>
                {" "}
                · base <Ar>{base}</Ar>
              </>
            )}
          </>
        }
      >
        {row.flags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {row.flags.map((f) => (
              <Chip key={f} tone="flag">
                {FLAG_LABELS[f]}
              </Chip>
            ))}
          </div>
        )}
        <Say>{row.action.text}</Say>
        {item.state === "noted_pseudo" && <Say tone="err">Noted as not a real word. The clean-up run marks it a practice word.</Say>}
        {item.state === "noted_wrong" && (
          <Say tone="err">
            Noted: respell as <Ar>{note?.correctedSpelling}</Ar>.
          </Say>
        )}
      </Hero>

      {check && check.checks.length > 0 && (
        <AutomaticCheckCard check={check} stored={word.arabic} canUse={todo && !busy} onUse={useSuggestion} />
      )}

      {fix && (
        <PaneCard title="Correct the harakat" aside={<span className="text-xs font-normal text-muted-foreground">the letters stay the same</span>}>
          <div className="grid gap-2">
            <input
              ref={fixRef}
              lang="ar"
              dir="rtl"
              aria-label="Corrected spelling"
              aria-invalid={!!fix.error}
              aria-describedby="fix-help"
              value={fix.value}
              onChange={(e) => setFix({ ...fix, value: e.target.value, error: null })}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-right font-naskh text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="grid grid-cols-[74px_1fr] items-center gap-x-2.5 gap-y-1.5 text-xs">
              <span className="text-muted-foreground">Now</span>
              <span>
                <Ar className="rounded-lg border bg-background px-2.5 text-[22px]">{word.arabic}</Ar>
              </span>
              <span className="text-muted-foreground">Corrected</span>
              <span>
                <Ar className="rounded-lg border bg-background px-2.5 text-[22px]">{fix.value}</Ar>
              </span>
            </div>
            {fix.error && (
              <p role="alert" className="text-[12.5px] text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]">
                {fix.error}
              </p>
            )}
            <p id="fix-help" className="text-xs text-muted-foreground">
              {fix.fromCheck && `Filled from the automatic check (${sourceLabel(fix.fromCheck)}). Check it before saving. `}
              {unused
                ? "No activity uses this spelling, so it is respelled now. Its review starts again."
                : "Activities use this spelling, so the bank is not changed here: the correction is saved as a shared note for the clean-up run."}
            </p>
          </div>
        </PaneCard>
      )}

      {others.length > 0 && (
        <PaneCard
          title="Same letters, other spellings"
          aside={<span className="text-xs font-normal text-muted-foreground">{others.length} live</span>}
        >
          <div className="flex flex-wrap gap-1.5">
            {others.map((o) => (
              <Chip key={o.id}>
                <Ar className="text-[17px] leading-normal">{o.arabic}</Ar>
              </Chip>
            ))}
          </div>
        </PaneCard>
      )}
    </>
  );

  const context = (
    <>
      <FamilyCard familyId={item.familyId} currentWordId={word.id} bank={bank} onOpen={openFamily} />
      <ConceptCard familyId={item.familyId} onOpen={openConcept} />
      <ContextCard title="Where it is used">
        <p className="text-[12.5px]">
          {word.usage_count} {word.usage_count === 1 ? "activity" : "activities"}
        </p>
      </ContextCard>
      {item.state === "approved" && item.decidedAt && (
        <ContextCard title="History">
          <p className="text-xs">
            <span className="text-muted-foreground">{shortAge(item.decidedAt, now)} ago</span> Approved
            {item.decidedBy && item.decidedBy === userId ? " by you" : ""}
          </p>
        </ContextCard>
      )}
    </>
  );

  let bar: React.ReactNode;
  if (fix) {
    bar = (
      <DecisionBar
        status="Type the corrected spelling."
        error={error}
        onDismissError={clearError}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFix(null)}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button size="sm" onClick={saveFix}>
              {unused ? "Respell" : "Save note"} <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
            </Button>
          </>
        }
      />
    );
  } else if (item.state === "approved") {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status="Approved. It is on the allow-list."
        actions={
          <Button variant="outline" size="sm" onClick={() => decide(withdrawSpelling(item, wordCache))}>
            Withdraw approval
          </Button>
        }
      />
    );
  } else if (item.state === "noted_pseudo" || item.state === "noted_wrong") {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status="Noted for the clean-up run. The bank is unchanged until it runs."
        actions={
          <Button variant="outline" size="sm" onClick={() => decide(clearSpellingNote(item, wordCache))}>
            Clear note
          </Button>
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
            <Button variant="outline" size="sm" onClick={notReal}>
              Not a real word <Kbd className="ms-2">p</Kbd>
            </Button>
            <Button variant="outline" size="sm" onClick={openFix}>
              Wrong harakat <Kbd className="ms-2">h</Kbd>
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
