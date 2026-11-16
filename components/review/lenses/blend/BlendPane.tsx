"use client";

/**
 * The Blend pane (CW-6): one word of the blend review queue, everything the
 * old `/review/blend` card did, driven by the keyboard. Each form shows its
 * split (with the override diff, flags and the split review) and its takes
 * (play, approve, reject with a numbered reason and the optional regenerate,
 * the mark editor) and Generate / Regenerate with settings, through the same
 * components the old page used.
 *
 * The word's open decisions (a split to review, a take to hear) are focus
 * targets: `tab` walks them, `a` approves the focused one, `r` rejects it
 * (a note for a split, a numbered reason for a take), `enter` confirms,
 * `space` plays. Split and take reviews are held 5 s (no inverse route), so
 * Undo cancels them; the next item opens after the word's last decision.
 */

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENDING_LABELS, type BlendEnding } from "@/lib/blendWord/config";
import { pseudoProposals, sortedForms, type SplitReviewBody } from "@/lib/blendWord/review";
import { generateBody, type BlendReviewTake, type TakeReviewBody } from "@/lib/blendWord/takes";
import { BLEND_REVIEW_KEY, useBlendAudioActions, WORD_BLEND_KEY } from "@/lib/hooks/useBlendReview";
import { reviewSplitSpec, reviewTakeSpec, type BlendDecisionContext } from "@/lib/review/actions/blend";
import {
  blendTargets,
  focusedTarget,
  moveTarget,
  splitTargetId,
  takeTargetId,
} from "@/lib/review/normalise/blend";
import type { BlendItem } from "@/lib/review/normalise/sources";
import type { TakeRowHandle } from "@/components/builder/forms/blendWord/audio/TakeRow";
import { usePaneCommands } from "../../commands";
import { ConceptCard, useFamilyConcept } from "../../context/ConceptCard";
import { FamilyCard } from "../../context/FamilyCard";
import { DecisionBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { ContextCard, KBD_ON_BUTTON, Kbd, Say } from "../../parts";
import type { PaneProps } from "../types";
import { BlendAiCheckCard } from "./BlendAiCheck";
import { PseudoProposals } from "./PseudoProposals";
import { ReviewFormPanel } from "./ReviewFormPanel";
import type { SplitReviewHandle } from "./SplitReviewControls";

const ok = Promise.resolve({ ok: true as const });

export function BlendPane(props: PaneProps) {
  const { roles, userId, bank, decide, error, clearError, busy, openFamily, openConcept, now } = props;
  const item = props.item as BlendItem;
  const word = item.data;
  const queryClient = useQueryClient();
  const actions = useBlendAudioActions();

  const forms = React.useMemo(() => sortedForms(word), [word]);
  const targets = React.useMemo(() => blendTargets(word), [word]);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const focus = focusedTarget(targets, focusId);
  /** The target whose rejection is open (a split's note, a take's reasons). */
  const [rejecting, setRejecting] = React.useState<string | null>(null);

  const splitHandles = React.useRef(new Map<BlendEnding, SplitReviewHandle | null>());
  const takeHandles = React.useRef(new Map<string, TakeRowHandle | null>());

  const bankWord = bank.wordsById.get(item.id);
  const familyId = bankWord?.family_id ?? null;
  const { concept } = useFamilyConcept(familyId);

  const refresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: BLEND_REVIEW_KEY }),
      queryClient.invalidateQueries({ queryKey: WORD_BLEND_KEY }),
    ]);
  }, [queryClient]);

  const ctxFor = (targetId: string): BlendDecisionContext => ({
    refresh,
    userId,
    last: targets.length === 1 && targets[0].id === targetId,
  });

  const settle = () => {
    setRejecting(null);
    // The field the reviewer typed in goes with the decision; the keys work again.
    const el = document.activeElement as HTMLElement | null;
    if (el && el !== document.body && el.closest("[data-blend-pane]")) el.blur();
  };

  const onReviewSplit = (form: BlendEnding) => (body: SplitReviewBody) => {
    decide(reviewSplitSpec(item, form, body, ctxFor(splitTargetId(form))));
    settle();
    return ok;
  };

  const findTake = (takeId: string): BlendReviewTake | undefined =>
    word.forms.flatMap((f) => f.takes).find((t) => t.id === takeId);

  const onReviewTake = (takeId: string, body: TakeReviewBody) => {
    const take = findTake(takeId);
    if (!take) return Promise.resolve({ ok: false as const, message: "This take is no longer listed. The list reloads." });
    decide(reviewTakeSpec(item, take, body, ctxFor(takeTargetId(takeId))));
    settle();
    return ok;
  };

  // ---- the focused decision ---------------------------------------------------------
  const approveFocus = () => {
    if (!focus) return;
    if (focus.type === "split") splitHandles.current.get(focus.form)?.send("approved");
    else takeHandles.current.get(focus.takeId)?.approve();
  };
  const startReject = () => {
    if (!focus) return;
    if (focus.type === "split") {
      setRejecting(focus.id);
      splitHandles.current.get(focus.form)?.focusNote();
    } else {
      takeHandles.current.get(focus.takeId)?.startReject();
    }
  };
  const confirmReject = () => {
    const t = targets.find((x) => x.id === rejecting);
    if (t?.type === "split") splitHandles.current.get(t.form)?.send("rejected");
    else if (rejecting?.startsWith("take:")) takeHandles.current.get(rejecting.slice(5))?.submitReject();
  };
  const cancelReject = () => {
    if (rejecting?.startsWith("take:")) takeHandles.current.get(rejecting.slice(5))?.cancelReject();
    setRejecting(null);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };
  const play = () => {
    const takeId =
      focus?.type === "take"
        ? focus.takeId
        : forms.flatMap((f) => f.takes).find((t) => t.current && t.url && t.status !== "rejected")?.id;
    const handle = takeId ? takeHandles.current.get(takeId) : null;
    if (!handle) return false;
    handle.play();
    return true;
  };

  usePaneCommands((cmd) => {
    switch (cmd.type) {
      case "nextDecision":
      case "prevDecision":
        if (targets.length === 0 || rejecting) return false;
        setFocusId(moveTarget(targets, focus?.id ?? null, cmd.type === "nextDecision" ? 1 : -1));
        return true;
      case "approve":
        if (!focus || rejecting) return false;
        approveFocus();
        return true;
      case "reject":
        if (!focus || rejecting) return false;
        startReject();
        return true;
      case "digit":
        if (!rejecting?.startsWith("take:")) return false;
        takeHandles.current.get(rejecting.slice(5))?.pickReasonByKey(cmd.n);
        return true;
      case "confirm":
        if (!rejecting) return false;
        confirmReject();
        return true;
      case "escape":
        if (!rejecting) return false;
        cancelReject();
        return true;
      case "play":
        return play();
      case "openFamily":
        if (!bankWord) return false;
        openFamily(familyId);
        return true;
      case "openConcept":
        if (!familyId) return false;
        openConcept(concept?.slug ?? null);
        return true;
      default:
        return false;
    }
  });

  const proposals = pseudoProposals(word);
  const usage = word.word?.usageCount ?? 0;

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <b className="font-medium text-foreground">{word.word?.english || "No meaning in the library"}</b>
            {word.word && (
              <span>
                · used by {usage} {usage === 1 ? "activity" : "activities"}
              </span>
            )}
            {word.word?.isPseudo && <Badge variant="secondary">Practice word</Badge>}
            {!word.word && <Badge variant="destructive">Missing from the library</Badge>}
          </span>
        }
      >
        {actions.generationOff && (
          <Say tone="calm">{actions.generationOff} Generate and Regenerate are off; you can still review the takes.</Say>
        )}
        {proposals.length > 0 && (
          <div className="mt-2.5">
            <PseudoProposals proposals={proposals} />
          </div>
        )}
      </Hero>

      {forms.map((form) => {
        const splitFocused = focus?.type === "split" && focus.form === form.form;
        return (
          <section key={form.form} aria-label={`${ENDING_LABELS[form.form].label} form`} className="min-w-0 rounded-xl border bg-card p-3.5">
            <ReviewFormPanel
              form={form}
              generationOff={actions.generationOff}
              onReviewSplit={onReviewSplit(form.form)}
              onGenerate={(regenerate, settings) => actions.generate(item.id, generateBody(form.form, regenerate, settings))}
              onReviewTake={onReviewTake}
              onSaveMarks={(takeId, marks) => actions.correctMarks(item.id, takeId, marks, form.units)}
              split={{
                focused: splitFocused,
                handleRef: (h: SplitReviewHandle | null) => {
                  splitHandles.current.set(form.form, h);
                },
              }}
              takeRowProps={(take) => ({
                focused: focus?.type === "take" && focus.takeId === take.id,
                handleRef: (h: TakeRowHandle | null) => {
                  takeHandles.current.set(take.id, h);
                },
                onRejectingChange: (open) => setRejecting(open ? takeTargetId(take.id) : null),
              })}
            />
          </section>
        );
      })}
    </>
  );

  const context = (
    <>
      {bankWord && (
        <>
          <FamilyCard familyId={familyId} currentWordId={item.id} bank={bank} onOpen={openFamily} />
          {familyId && <ConceptCard familyId={familyId} onOpen={openConcept} />}
        </>
      )}
      <BlendAiCheckCard word={word} />
      <ContextCard title="Where it is used">
        <p className="text-[12.5px]">
          {word.word ? `${usage} ${usage === 1 ? "activity" : "activities"}` : "The word is missing from the library."}
        </p>
      </ContextCard>
    </>
  );

  const what = focus?.type === "split" ? "split" : "take";
  const heldHint = busy === "held" && (
    <span>
      Sending in a few seconds. <Kbd>u</Kbd> undoes it.
    </span>
  );
  let bar: React.ReactNode;
  if (rejecting) {
    const isSplit = !rejecting.startsWith("take:");
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status={isSplit ? "A rejected split needs a note." : "Pick a reason with its number; the note is optional unless the reason is Other."}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={cancelReject}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmReject}>
              Reject {isSplit ? "split" : "take"} <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
            </Button>
          </>
        }
      />
    );
  } else if (focus) {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status={
          heldHint || (
            <span className="flex flex-wrap items-center gap-1.5">
              {targets.length} {targets.length === 1 ? "decision" : "decisions"} on this word
              {targets.length > 1 && (
                <>
                  {" "}
                  · <Kbd>tab</Kbd> next decision
                </>
              )}
              {focus.type === "take" && (
                <>
                  {" "}
                  · <Kbd>space</Kbd> play
                </>
              )}
              {targets.length === 1 && <NextHint />}
            </span>
          )
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={startReject}>
              <X className="me-1.5 h-4 w-4" aria-hidden="true" /> Reject {what} <Kbd className="ms-2">r</Kbd>
            </Button>
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={approveFocus}>
              <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Approve {what}{" "}
              <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
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
        status={
          item.state === "failed"
            ? "Nothing to approve: a take failed or is not voiceable. Change the spelling or the split, or reject it and make a new one."
            : item.state === "rejected"
              ? "A split was rejected. It waits for the author to fix it."
              : "Everything on this word is reviewed."
        }
      />
    );
  }

  return (
    <div data-blend-pane className="contents">
      <PaneFrame item={item} main={main} context={context} bar={bar} />
    </div>
  );
}
