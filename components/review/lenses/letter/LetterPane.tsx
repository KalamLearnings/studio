"use client";

/**
 * The Letter sounds pane (CW-11): listen to one file of the audio library's
 * `letter_sounds` category, beside the other files of its letter. A phrase
 * reviewer or a curriculum lead flags a problem (BE-3, `r`, a numbered reason,
 * a note, `enter`) and clears a flag (`a`); both are sent at once and Undo
 * sends the inverse. Other staff listen only. A flag changes no file: what
 * children hear stays the same until the file is replaced in the audio library.
 */

import * as React from "react";
import Link from "next/link";
import { Flag, FlagOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlayTakeButton, type PlayTakeHandle } from "@/components/builder/forms/blendWord/audio/PlayTakeButton";
import { useLetterCache } from "@/lib/hooks/useLetterSoundReview";
import { canDecide, GATE_TEXT, KIND_META, shortAge } from "@/lib/review/inbox";
import { clearLetterFlagSpec, flagLetterSpec } from "@/lib/review/actions/letters";
import {
  flagLine,
  LETTER_FLAG_LABELS,
  LETTER_FLAG_REASONS,
  letterFlagBody,
  type LetterFlagReason,
  type LetterItem,
} from "@/lib/review/normalise/letters";
import { usePaneCommands } from "../../commands";
import { DecisionBar, GateBar, Hero, PaneFrame } from "../../PaneFrame";
import { Ar, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say } from "../../parts";
import type { PaneProps } from "../types";

interface FlagDraft {
  reason: LetterFlagReason | "";
  note: string;
  error: string | null;
}

/** "(by you, 3 h ago)." */
function flaggedWhen(at: string, who: string, userId: string | null, now: number): string {
  const age = shortAge(at, now);
  const parts = [who && who === userId ? "by you" : "", age && age !== "just now" ? `${age} ago` : age].filter(Boolean);
  return parts.length ? `(${parts.join(", ")}).` : "";
}

export function LetterPane(props: PaneProps) {
  const { roles, userId, decide, error, clearError, busy, now } = props;
  const item = props.item as LetterItem;
  const { file, flag, group, label } = item.data;
  const cache = useLetterCache();
  const reviewer = canDecide(KIND_META.letter.gate, roles);
  const broken = file.status === "broken";

  const [draft, setDraft] = React.useState<FlagDraft | null>(null);
  const noteRef = React.useRef<HTMLInputElement>(null);
  const playRef = React.useRef<PlayTakeHandle>(null);

  const openFlag = () => {
    if (!reviewer) return;
    setDraft({ reason: flag?.reason ?? "", note: flag?.note ?? "", error: null });
  };
  const pick = (reason: LetterFlagReason) => {
    setDraft((d) => (d ? { ...d, reason, error: null } : d));
    if (reason === "other") requestAnimationFrame(() => noteRef.current?.focus());
  };
  const saveFlag = () => {
    if (!draft) return;
    const body = letterFlagBody(draft.reason, draft.note);
    if (!body.ok) {
      setDraft({ ...draft, error: body.error });
      if (draft.reason === "other") noteRef.current?.focus();
      return;
    }
    setDraft(null);
    noteRef.current?.blur();
    decide(flagLetterSpec(item, body.body, userId, cache));
  };
  const clearFlag = () => {
    if (reviewer && flag) decide(clearLetterFlagSpec(item, cache));
  };

  usePaneCommands((cmd) => {
    if (busy && cmd.type !== "escape" && cmd.type !== "play") return false;
    switch (cmd.type) {
      case "reject":
        if (!reviewer || draft) return false;
        openFlag();
        return true;
      case "approve":
        if (!reviewer || draft || !flag) return false;
        clearFlag();
        return true;
      case "digit": {
        if (!draft) return false;
        const reason = LETTER_FLAG_REASONS[cmd.n - 1];
        if (reason) pick(reason);
        return true;
      }
      case "confirm":
        if (!draft) return false;
        saveFlag();
        return true;
      case "escape":
        if (!draft) return false;
        setDraft(null);
        noteRef.current?.blur();
        return true;
      case "play":
        if (!file.url || broken) return false;
        playRef.current?.toggle();
        return true;
      default:
        return false;
    }
  });

  const letter = group.letter;
  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        big={
          <span className="flex min-w-0 items-center justify-end gap-5">
            {letter && <Ar className="text-[30px] text-muted-foreground">{letter.name_arabic}</Ar>}
            <Ar className="min-w-0 text-[46px] font-medium leading-[1.75] min-[1280px]:text-[54px]">{file.title}</Ar>
          </span>
        }
        sub={
          <>
            <b className="font-medium text-foreground">{label || "No letter tag"}</b> · <span className="font-mono">{file.name}</span>
            {file.status && <> · registry status {file.status}</>}
          </>
        }
      >
        {broken && <Say tone="err">The file is missing from storage. Replace it in the audio library.</Say>}
        {flag && (
          <Say tone="warn">
            <b className="font-medium">Flagged: {flagLine(flag)}</b>
            <span className="text-muted-foreground"> {flaggedWhen(flag.flagged_at, flag.flagged_by, userId, now)}</span> Children
            still hear this file until it is replaced in the audio library.
          </Say>
        )}
      </Hero>

      <PaneCard title="Listen" aside={file.durationMs ? <span className="text-xs font-normal text-muted-foreground">{(file.durationMs / 1000).toFixed(1)} s</span> : undefined}>
        <div className="flex flex-wrap items-center gap-3">
          <PlayTakeButton url={broken ? null : file.url} handleRef={playRef} />
          {file.ttsText && (
            <span className="text-xs text-muted-foreground">
              Made from the text <Ar className="text-base">{file.ttsText}</Ar>
            </span>
          )}
        </div>
      </PaneCard>

      {draft && (
        <PaneCard title={flag ? "Change the flag" : "Flag a problem"} aside={<span className="text-xs font-normal text-muted-foreground">press a reason&apos;s number</span>}>
          <div className="grid gap-2.5">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Reason">
              {LETTER_FLAG_REASONS.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={draft.reason === r}
                  onClick={() => pick(r)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs",
                    draft.reason === r ? "border-destructive bg-destructive/10 font-medium" : "hover:border-destructive/50",
                  )}
                >
                  <Kbd>{i + 1}</Kbd>
                  {LETTER_FLAG_LABELS[r]}
                </button>
              ))}
            </div>
            <input
              ref={noteRef}
              aria-label="Note"
              maxLength={500}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value, error: null })}
              placeholder={draft.reason === "other" ? "Note (needed for Other)" : "Note (optional)"}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {draft.error && (
              <p role="alert" className="text-[12.5px] text-[hsl(0_60%_45%)] dark:text-[hsl(0_70%_70%)]">
                {draft.error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">A flag is a note for the content team. It changes no file and no status.</p>
          </div>
        </PaneCard>
      )}
    </>
  );

  const context = (
    <>
      <ContextCard title="Letter">
        {letter ? (
          <dl className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-1 text-[12.5px]">
            <dt className="text-muted-foreground">Letter</dt>
            <dd>
              <Ar className="text-xl">{letter.letter}</Ar>
            </dd>
            <dt className="text-muted-foreground">Name</dt>
            <dd>
              {letter.name_english} · <Ar>{letter.name_arabic}</Ar>
            </dd>
            <dt className="text-muted-foreground">Id</dt>
            <dd className="font-mono">{letter.id}</dd>
          </dl>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            {group.id ? `Tagged ${group.id}, which is not a letter in the list.` : "This file has no letter tag. Tag it in the audio library to group it."}
          </p>
        )}
      </ContextCard>
      <ContextCard title={letter ? `Files of ${letter.name_english}` : "Files with no letter"} aside={<span>{group.files.length}</span>}>
        <ul className="grid gap-1">
          {group.files.map((f) => (
            <li key={f.id} className={cn("flex items-center gap-2 rounded-md px-1.5 py-0.5", f.id === file.id && "bg-primary/10")}>
              <span className="flex flex-1 items-center justify-end gap-1.5">
                {f.variant && <span className="text-[11px] text-muted-foreground">{f.variant}</span>}
                <Ar className="text-[17px] leading-normal">{f.title}</Ar>
              </span>
              {f.id === file.id && <span className="text-[11px] text-muted-foreground">this file</span>}
              <PlayTakeButton url={f.status === "broken" ? null : f.url} />
            </li>
          ))}
        </ul>
      </ContextCard>
      <ContextCard title="Manage the file">
        <Link href="/audio" className="text-[12.5px] text-primary hover:underline">
          Open the audio library
        </Link>
      </ContextCard>
    </>
  );

  const listenHint = (
    <span className="flex flex-wrap items-center gap-1.5">
      {file.url && !broken && (
        <>
          <Kbd>space</Kbd> play ·
        </>
      )}
      <Kbd>j</Kbd> next file
    </span>
  );

  let bar: React.ReactNode;
  if (draft) {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status="Pick a reason with its number."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button variant="destructive" size="sm" onClick={saveFlag}>
              <Flag className="me-1.5 h-4 w-4" aria-hidden="true" /> {flag ? "Save the flag" : "Flag"}{" "}
              <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
            </Button>
          </>
        }
      />
    );
  } else if (!reviewer) {
    bar = flag ? (
      <GateBar item={item} roles={roles} status={`Flagged: ${flagLine(flag)}.`} />
    ) : (
      <DecisionBar
        status={
          <span className="flex flex-wrap items-center gap-1.5">
            {listenHint}
            <span>· Only {GATE_TEXT.phrase} can flag a file.</span>
          </span>
        }
      />
    );
  } else if (flag) {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={<>Clear the flag once the file is replaced, or if it was wrong. {listenHint}</>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={openFlag}>
              Change the flag <Kbd className="ms-2">r</Kbd>
            </Button>
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={clearFlag}>
              <FlagOff className="me-1.5 h-4 w-4" aria-hidden="true" /> Clear the flag <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
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
        status={listenHint}
        actions={
          <Button variant="outline" size="sm" onClick={openFlag}>
            <Flag className="me-1.5 h-4 w-4" aria-hidden="true" /> Flag a problem <Kbd className="ms-2">r</Kbd>
          </Button>
        }
      />
    );
  }

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
