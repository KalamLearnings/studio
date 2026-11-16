"use client";

/**
 * The phrase pane (CW-8): a phrase or sentence a reading activity uses.
 * Approve (`a`, blocked while a word has a problem) or Reject (`r`, BE-5:
 * `1`-`6` pick a reason, `other` needs a note, `enter`). Both have an inverse
 * route, so Undo sends it; an approved phrase can be revoked and a rejection
 * cleared from the bar. Only a phrase reviewer or a curriculum lead decides.
 */

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReasonPicker } from "@/components/phrases/ReasonPicker";
import { usePhraseCache } from "@/lib/hooks/useReviewDraftPhraseSources";
import {
  PHRASE_REJECTION_LABELS,
  PHRASE_REJECTION_REASONS,
  phraseRejectionBody,
  reasonText,
  rejectionReasonText,
  usedInText,
  type PhraseRejectionReason,
} from "@/lib/phrases/phraseReview";
import { approvePhraseSpec, clearRejectionSpec, rejectPhraseSpec, revokePhraseSpec } from "@/lib/review/actions/phrases";
import { canDecide, shortAge } from "@/lib/review/inbox";
import { rejectedAt, rejectedBy, type PhraseItem } from "@/lib/review/normalise/sources";
import { usePaneCommands } from "../../commands";
import { DecisionBar, GateBar, Hero, NextHint, PaneFrame } from "../../PaneFrame";
import { Ar, ContextCard, KBD_ON_BUTTON, Kbd, PaneCard, Say } from "../../parts";
import type { PaneProps } from "../types";

const REASONS = PHRASE_REJECTION_REASONS.map((value) => ({ value, label: PHRASE_REJECTION_LABELS[value] }));

interface RejectDraft {
  reason: PhraseRejectionReason | null;
  note: string;
  error: string | null;
}

const who = (id: string | null | undefined, userId: string | null) => (id && id === userId ? "you" : "a reviewer");

export function PhrasePane(props: PaneProps) {
  const { roles, userId, bank, decide, error, clearError, busy, now } = props;
  const item = props.item as PhraseItem;
  const entry = item.data;
  const cache = usePhraseCache();
  const can = canDecide("phrase", roles);
  const todo = item.state === "todo";
  const problems = entry.word_problems;
  const [reject, setReject] = React.useState<RejectDraft | null>(null);
  const kindWord = entry.is_sentence ? "sentence" : "phrase";

  const approve = () => can && todo && problems.length === 0 && decide(approvePhraseSpec(item, cache, userId));
  const startReject = () => can && todo && setReject({ reason: null, note: "", error: null });
  const confirmReject = () => {
    if (!reject) return;
    const parsed = phraseRejectionBody(reject.reason ?? "", reject.note, entry.is_sentence);
    if (!parsed.ok) return setReject({ ...reject, error: parsed.error });
    setReject(null);
    decide(rejectPhraseSpec(item, parsed.body, cache, userId));
  };

  usePaneCommands((cmd) => {
    if (busy && cmd.type !== "escape") return false;
    switch (cmd.type) {
      case "approve":
        if (reject || !can || !todo || problems.length > 0) return false;
        approve();
        return true;
      case "reject":
        if (reject || !can || !todo) return false;
        startReject();
        return true;
      case "digit":
        if (!reject || cmd.n < 1 || !REASONS[cmd.n - 1]) return false;
        setReject({ ...reject, reason: REASONS[cmd.n - 1].value, error: null });
        return true;
      case "confirm":
        if (!reject) return false;
        confirmReject();
        return true;
      case "escape":
        if (!reject) return false;
        setReject(null);
        return true;
      default:
        return false;
    }
  });

  // The words, as written in the phrase and as the bank has them.
  const written = (entry.text ?? "").split(/\s+/).filter(Boolean);
  const words = entry.word_ids.map((id, i) => ({
    id,
    text: written.length === entry.word_ids.length ? written[i] : (bank.wordsById.get(id)?.arabic ?? id),
    bank: bank.wordsById.get(id),
    problem: problems.find((p) => p.word_id === id),
  }));
  const long = written.length > 3;

  const main = (
    <>
      <Hero
        item={item}
        roles={roles}
        userId={userId}
        now={now}
        long={long}
        big={entry.text ? undefined : <div className="w-full py-1.5 text-left text-base text-muted-foreground">A word row is missing, so the text cannot be built.</div>}
        sub={
          <>
            <b className="font-medium text-foreground">{entry.is_sentence ? "Sentence" : "Phrase"}</b> · {entry.word_ids.length} words
            {todo && entry.reason ? ` · ${reasonText(entry.reason)}` : ""}
          </>
        }
      >
        {problems.length > 0 && (
          <Say tone="warn">
            {problems.map((p) => (
              <span key={`${p.word_id}-${p.issue}`} className="block">
                {p.message}
              </span>
            ))}
            <span className="mt-1 block text-xs text-muted-foreground">Fix the word in Spellings first; then the {kindWord} can be approved.</span>
          </Say>
        )}
        {item.state === "rejected" && entry.rejection && (
          <Say tone="err">
            Rejected: {rejectionReasonText(entry.rejection.reason)}
            {entry.rejection.note ? `. ${entry.rejection.note}` : ""}
          </Say>
        )}
        <Say>
          A native reader checks the words, the harakat and the case endings together. The reviewer should not be the {kindWord}&apos;s
          author (team rule).
        </Say>
      </Hero>

      <PaneCard title="Word by word" aside={<span className="text-xs font-normal text-muted-foreground">each must be a reviewed word</span>}>
        <div dir="rtl" className="flex flex-wrap gap-1.5">
          {words.map((w) => (
            <span
              key={w.id}
              className={cn(
                "grid justify-items-center gap-0.5 rounded-lg border bg-background px-2.5 py-1",
                w.problem && "border-warning/60 bg-warning/10",
              )}
              title={w.problem?.message ?? w.id}
            >
              <Ar className="text-[24px] leading-[1.6]">{w.text}</Ar>
              <span dir="ltr" className="text-[10.5px] text-muted-foreground">
                {w.problem ? "problem" : w.bank ? (w.bank.reviewed_at ? "reviewed" : "not reviewed") : ""}
              </span>
            </span>
          ))}
        </div>
      </PaneCard>

      {reject && (
        <PaneCard title={`Reject the ${kindWord}`} aside={<span className="text-xs font-normal text-muted-foreground">about the text, not a recording</span>}>
          <ReasonPicker
            label={`Why the ${kindWord} is rejected`}
            reasons={REASONS}
            value={reject.reason}
            onChange={(reason) => setReject({ ...reject, reason, error: null })}
            note={reject.note}
            onNote={(note) => setReject({ ...reject, note, error: null })}
            noteNeeded={reject.reason === "other"}
            error={reject.error}
            numbered
          />
        </PaneCard>
      )}

      <PaneCard title="Recording">
        <p className="text-[12.5px] text-muted-foreground">
          {item.state === "approved"
            ? "Approved phrases get a whole-phrase recording. Its takes are under Recordings (7)."
            : `Approve the ${kindWord} before recording it.`}
        </p>
      </PaneCard>
    </>
  );

  const decided =
    item.state === "approved" && entry.approval
      ? `Approved by ${who(entry.approval.reviewed_by, userId)}, ${shortAge(entry.approval.reviewed_at, now)} ago`
      : item.state === "rejected" && entry.rejection
        ? `Rejected by ${who(rejectedBy(entry.rejection), userId)}${rejectedAt(entry.rejection) ? `, ${shortAge(rejectedAt(entry.rejection), now)} ago` : ""}`
        : null;

  const context = (
    <>
      <ContextCard title="Where it is used">
        {entry.used_in.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">No activity uses it now.</p>
        ) : (
          <ul className="grid list-disc gap-0.5 ps-4 text-[12.5px]">
            {entry.used_in.map((u) => (
              <li key={`${u.activity_id}-${u.path}`}>{usedInText(u)}</li>
            ))}
          </ul>
        )}
      </ContextCard>
      {decided && (
        <ContextCard title="History">
          <p className="text-xs">{decided}</p>
        </ContextCard>
      )}
    </>
  );

  let bar: React.ReactNode;
  if (!can) {
    bar = (
      <GateBar
        item={item}
        roles={roles}
        status={item.state === "approved" ? "Approved." : item.state === "rejected" ? "Rejected." : "Pending."}
      />
    );
  } else if (item.state === "approved") {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={decided ? `${decided}.` : "Approved."}
        actions={
          <Button variant="outline" size="sm" onClick={() => decide(revokePhraseSpec(item, cache))}>
            Revoke
          </Button>
        }
      />
    );
  } else if (item.state === "rejected") {
    bar = (
      <DecisionBar
        busy={busy}
        error={error}
        onDismissError={clearError}
        status={`${decided ?? "Rejected"}. Clearing it makes the ${kindWord} pending again.`}
        actions={
          <Button variant="outline" size="sm" onClick={() => decide(clearRejectionSpec(item, cache))}>
            Clear rejection
          </Button>
        }
      />
    );
  } else if (reject) {
    bar = (
      <DecisionBar
        error={error}
        onDismissError={clearError}
        status={
          <>
            Pick a reason with <Kbd>1</Kbd>-<Kbd>{String(REASONS.length)}</Kbd>
          </>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReject(null)}>
              Cancel <Kbd className="ms-2">esc</Kbd>
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmReject}>
              Reject {kindWord} <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>enter</Kbd>
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
        status={problems.length > 0 ? "A word problem blocks approval." : <NextHint />}
        actions={
          <>
            <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={startReject}>
              Reject <Kbd className="ms-2">r</Kbd>
            </Button>
            <Button
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90"
              onClick={approve}
              disabled={problems.length > 0}
              title={problems.length > 0 ? "Fix the word problems first" : undefined}
            >
              <Check className="me-1.5 h-4 w-4" aria-hidden="true" /> Approve {kindWord} <Kbd className={cn("ms-2", KBD_ON_BUTTON)}>a</Kbd>
            </Button>
          </>
        }
      />
    );
  }

  return <PaneFrame item={item} main={main} context={context} bar={bar} />;
}
