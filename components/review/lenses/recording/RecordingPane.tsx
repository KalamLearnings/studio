"use client";

/**
 * The recording pane (CW-8): the whole-phrase audio of an approved phrase.
 * The new take sits beside the take children hear now, so the reviewer can
 * compare: `space` plays the new take, `shift+space` the served one. Approve
 * (`a`) or Reject (`r`, `1`-`8` pick a reason, `other` needs a note,
 * `enter`) are held 5 s so Undo cancels them; `g` makes a new take. When
 * recording is switched off that is said calmly and generating disappears;
 * takes already made can still be heard and decided. Only a phrase reviewer
 * or a curriculum lead decides.
 */

import * as React from "react";
import { Check, Mic, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GenerateTakeControls, useGenerateTake } from "@/components/phrases/audio/GenerateTake";
import { TakePlayer } from "@/components/phrases/audio/TakePlayer";
import { EMPTY_TAKE_REVIEW, TAKE_REASONS, TakeReviewForm, type TakeReviewDraft } from "@/components/phrases/audio/TakeReviewForm";
import { useTakeAudio } from "@/components/phrases/audio/useTakeAudio";
import { usePhraseAudio } from "@/lib/hooks/usePhraseAudio";
import { usePhraseCache } from "@/lib/hooks/useReviewDraftPhraseSources";
import {
  GENERATION_OFF_TEXT,
  hasTakeInProgress,
  phraseAudioErrorText,
  phraseRejectBody,
  TAKE_STATUS_LABELS,
  type PhraseAudioTake,
} from "@/lib/phrases/phraseAudio";
import { approveTakeSpec, rejectTakeSpec } from "@/lib/review/actions/phrases";
import { canDecide, shortAge, type PillTone } from "@/lib/review/inbox";
import { recordingTakeToHear, type RecordingItem } from "@/lib/review/normalise/sources";
import { usePaneCommands } from "../../commands";
import { DecisionBar, GateBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say, SkeletonBar, StatusPill } from "../../parts";
import type { PaneProps } from "../types";

const TAKE_TONE: Record<PhraseAudioTake["status"], PillTone> = {
  pending: "info",
  needs_review: "todo",
  approved: "ok",
  rejected: "no",
  failed: "no",
};

function takeEvents(takes: readonly PhraseAudioTake[], now: number): { at: string; text: string }[] {
  const out: { at: string; text: string; t: number }[] = [];
  for (const t of takes) {
    if (t.status !== "failed") out.push({ at: shortAge(t.created_at, now), text: "Take made", t: Date.parse(t.created_at) || 0 });
    if (t.reviewed_at && (t.status === "approved" || t.status === "rejected")) {
      out.push({
        at: shortAge(t.reviewed_at, now),
        text: t.status === "approved" ? `Take approved${t.served ? ", now served" : ""}` : `Take rejected${t.error ? `: ${t.error}` : ""}`,
        t: Date.parse(t.reviewed_at) || 0,
      });
    }
    if (t.status === "failed") out.push({ at: shortAge(t.created_at, now), text: `Take failed${t.error ? `: ${t.error}` : ""}`, t: Date.parse(t.created_at) || 0 });
  }
  return out.sort((a, b) => b.t - a.t).slice(0, 8);
}

export function RecordingPane(props: PaneProps) {
  const { roles, userId, decide, error, clearError, busy, now } = props;
  const item = props.item as RecordingItem;
  const { entry } = item.data;
  const cache = usePhraseCache();
  const can = canDecide("phrase", roles);
  const query = usePhraseAudio(item.id);
  const status = query.data;
  const gen = useGenerateTake(item.id, () => void cache.refreshList());

  const newTake = status ? recordingTakeToHear(status) : null;
  const served = status?.takes.find((t) => t.served || t.id === status.served_take_id) ?? null;
  const latest = status?.takes.find((t) => t.current) ?? null;
  const lastFailed = !newTake && latest?.status === "failed" ? latest : null;
  const making = status ? hasTakeInProgress(status) : item.data.audio.state === "in_progress";
  const off = !(status?.generation_enabled ?? item.data.generationEnabled) || gen.off;
  const hasTakes = (status?.takes ?? []).some((t) => t.current);
  // What a reject acts on: the take waiting, else (an approved recording) the served one.
  const rejectTarget = newTake ?? (item.state === "approved" ? served : null);

  const newAudio = useTakeAudio(newTake?.url ?? null);
  const servedAudio = useTakeAudio(served?.url ?? null);
  const [reject, setReject] = React.useState<TakeReviewDraft | null>(null);
  const decided = item.state === "approved" || item.state === "rejected";

  const approve = () => {
    if (!can || !newTake || item.state !== "todo") return;
    newAudio.stop();
    decide(approveTakeSpec(item, newTake.id, cache));
  };
  const startReject = () => can && rejectTarget && setReject(EMPTY_TAKE_REVIEW);
  const confirmReject = () => {
    if (!reject || !rejectTarget) return;
    const parsed = phraseRejectBody(reject.reason ?? "", reject.note);
    if (!parsed.ok) return setReject({ ...reject, error: parsed.error });
    setReject(null);
    newAudio.stop();
    servedAudio.stop();
    decide({ ...rejectTakeSpec(item, rejectTarget.id, parsed.body, cache), advance: rejectTarget.id === newTake?.id });
  };
  const regenerate = () => can && !off && !making && gen.go();

  usePaneCommands((cmd) => {
    if (busy && cmd.type !== "escape") return false;
    switch (cmd.type) {
      case "play":
        if (newTake?.url) newAudio.toggle();
        else if (served?.url) servedAudio.toggle();
        else return false;
        return true;
      case "playServed":
        if (!served?.url) return false;
        servedAudio.toggle();
        return true;
      case "approve":
        if (reject || !can || !newTake || item.state !== "todo") return false;
        approve();
        return true;
      case "reject":
        if (reject || !can || !rejectTarget || item.state === "rejected") return false;
        startReject();
        return true;
      case "digit":
        if (!reject || cmd.n < 1 || !TAKE_REASONS[cmd.n - 1]) return false;
        setReject({ ...reject, reason: TAKE_REASONS[cmd.n - 1].value, error: null });
        return true;
      case "confirm":
        if (!reject) return false;
        confirmReject();
        return true;
      case "escape":
        if (!reject) return false;
        setReject(null);
        return true;
      case "regenerate":
        if (!can || off || making || reject) return false;
        regenerate();
        return true;
      default:
        return false;
    }
  });

  const sub = making
    ? "a take is being made"
    : lastFailed
      ? "the last recording failed"
      : newTake
        ? served
          ? "a new take waits beside the served one"
          : "a recording waits for review"
        : served
          ? "children hear the served take"
          : "no take to hear";

  const takeRow = (t: PhraseAudioTake, label: string, audio: typeof newAudio, focus: boolean, extra?: React.ReactNode) => (
    <div className={cn("grid gap-2.5 rounded-[10px] border bg-background/60 p-3", focus && "border-primary/70 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]")}>
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
        {label} <StatusPill pill={{ tone: TAKE_TONE[t.status], text: t.served ? "Served" : TAKE_STATUS_LABELS[t.status] }} />
        {extra}
      </div>
      {t.url ? (
        <TakePlayer audio={audio} durationMs={t.duration_ms} label={label.toLowerCase()} keyHint={audio === servedAudio ? "shift+space" : "space"} />
      ) : (
        <p className="text-xs text-muted-foreground">No audio file.</p>
      )}
    </div>
  );

  let takes: React.ReactNode;
  if (query.isPending && !status) {
    takes = (
      <div className="grid gap-2" aria-busy="true">
        <SkeletonBar className="h-10" />
        <SkeletonBar className="h-10 w-4/5" />
      </div>
    );
  } else if (query.isError || !status) {
    takes = (
      <Say tone="err" className="mt-0">
        The takes could not be loaded: {phraseAudioErrorText(query.error)}{" "}
        <button type="button" onClick={() => void query.refetch()} className="text-primary underline">
          Retry
        </button>
      </Say>
    );
  } else {
    takes = (
      <div className="grid gap-2.5">
        {newTake &&
          takeRow(
            newTake,
            "New take",
            newAudio,
            item.state === "todo",
          )}
        {reject && rejectTarget && (
          <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-2 text-[12.5px] font-semibold">
              Reject the {rejectTarget.id === newTake?.id ? "new" : "served"} take
            </p>
            <TakeReviewForm draft={reject} onChange={setReject} numbered />
          </div>
        )}
        {lastFailed && (
          <div className="grid gap-2 rounded-[10px] border bg-background/60 p-3">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold">
              Latest take <StatusPill pill={{ tone: "no", text: "Failed" }} />
            </div>
            <Say tone="err" className="mt-0">
              {lastFailed.error ?? "The take failed."}
            </Say>
          </div>
        )}
        {making && (
          <p className="text-[12.5px] text-muted-foreground" aria-live="polite">
            A take is being made. This looks again every few seconds.
          </p>
        )}
        {served &&
          takeRow(
            served,
            "Served now",
            servedAudio,
            false,
            <span className="font-normal text-muted-foreground">what children hear today</span>,
          )}
        {served && newTake && (
          <p className="text-xs text-muted-foreground">
            <Kbd>shift</Kbd> <Kbd>space</Kbd> plays the served take to compare.
          </p>
        )}
        {can && !off && !reject && (
          <div className="mt-1">
            <GenerateTakeControls state={gen} hasTakes={hasTakes} keyHint={<Kbd className="ms-2">g</Kbd>} />
          </div>
        )}
      </div>
    );
  }

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        long={(entry.text ?? "").split(/\s+/).length > 3}
        sub={
          <>
            <b className="font-medium text-foreground">{entry.is_sentence ? "Sentence" : "Phrase"}</b> · approved text · {sub}
          </>
        }
      >
        {off && (
          <Say tone="calm">
            <Mic className="me-1.5 inline h-[15px] w-[15px] align-[-3px]" aria-hidden="true" />
            {GENERATION_OFF_TEXT}{" "}
            {newTake ? "You can still hear and decide the takes already made." : "Nothing else needs you here for now."}
          </Say>
        )}
      </Hero>
      <PaneCard title="Takes">{takes}</PaneCard>
    </>
  );

  const events = status ? takeEvents(status.takes, now) : [];
  const context = (
    <>
      {events.length > 0 && (
        <ContextCard title="History">
          <div className="grid gap-1 text-xs">
            {events.map((e, i) => (
              <div key={i} className="grid grid-cols-[64px_1fr] gap-2">
                <time className="text-muted-foreground">{e.at ? `${e.at}${e.at === "just now" ? "" : " ago"}` : ""}</time>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        </ContextCard>
      )}
      <ContextCard title="Text">
        <p className="text-[12.5px] text-muted-foreground">
          The recording is of the approved text only. If the text changes, older takes go out of date and need a new one.
        </p>
      </ContextCard>
    </>
  );

  let bar: React.ReactNode;
  if (!can) {
    bar = (
      <GateBar
        item={item}
        roles={roles}
        status={lastFailed ? "The last recording failed." : newTake ? "A recording waits for review." : making ? "A take is being made." : "Served."}
      />
    );
  } else if (reject) {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status={
          <>
            Pick a reason with <Kbd>1</Kbd>-<Kbd>8</Kbd>
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReject(null)}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmReject}>
              Reject take <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
            </Button>
          </>
        }
      />
    );
  } else if (decided && !newTake) {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={item.state === "approved" ? "Served. Children hear this take." : "Rejected."}
        actions={
          item.state === "approved" &&
          served && (
            <Button variant="outline" size="sm" onClick={startReject}>
              Reject the served take <Kbd className="ms-2">r</Kbd>
            </Button>
          )
        }
      />
    );
  } else if (newTake && item.state === "todo") {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={
          <>
            <Kbd>space</Kbd> play · <NextHint />
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={startReject}>
              Reject <Kbd className="ms-2">r</Kbd>
            </Button>
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={approve}>
              <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Approve take <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
            </Button>
          </>
        }
      />
    );
  } else if (lastFailed || item.state === "failed") {
    bar = off ? (
      <DecisionBar busy={busy} error={error} onDismissError={clearError} status="Recording is off, so there is nothing to do here now." />
    ) : (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status="The voice service may be busy; try again."
        actions={
          <Button size="sm" onClick={regenerate} disabled={gen.pending}>
            <Wand2 className="me-1.5 h-4 w-4" aria-hidden="true" /> Make a new take <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>g</Kbd>
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
        status={making ? "A take is being made; it shows here when it is ready." : query.isPending ? "Loading the takes..." : "Nothing to decide."}
      />
    );
  }

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
