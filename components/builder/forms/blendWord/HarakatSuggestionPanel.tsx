"use client";

import * as React from "react";
import { Sparkles, Loader2, Check, X, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  COMPLETE_MESSAGE,
  NO_VALID_SUGGESTION_MESSAGE,
  type HarakatErrorView,
  type HarakatOffer,
  type HarakatOption,
} from "@/lib/blendWord/harakat";
import { IssueList, kindBarClass } from "./BlendFormColumn";

interface HarakatSuggestionPanelProps {
  /** Why the action is offered (missing marks, or no full form for a full-ending activity). */
  reason: string;
  /** The action is disabled with this reason (the switch is off, the budget is used up). */
  disabledReason: string | null;
  pending: boolean;
  offer: HarakatOffer | null;
  error: HarakatErrorView | null;
  /** The ending form the activity uses, for the split preview's label. */
  formLabel: string;
  onSuggest: () => void;
  /** Applies the chosen reading. Called only from Confirm. */
  onConfirm: (fullText: string) => void;
  /** Closes the offer; the word is unchanged. */
  onDismiss: () => void;
}

/** The full form with the letters whose marks the suggestion changes highlighted. */
function MarkedWord({ option }: { option: HarakatOption }) {
  return (
    <span className="font-arabic text-2xl" dir="rtl">
      {option.letters.map((l, i) => (
        <span
          key={i}
          className={cn(l.changed && "rounded-sm bg-emerald-200/70 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100")}
        >
          {l.letter}
          {l.marks}
        </span>
      ))}
    </span>
  );
}

function OptionCard({
  option,
  selected,
  formLabel,
  onSelect,
}: {
  option: HarakatOption;
  selected: boolean;
  formLabel: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!option.valid}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border-2 p-3 text-left transition-all",
        !option.valid && "cursor-not-allowed opacity-80",
        selected ? "border-primary bg-primary/5" : "border-border",
        option.valid && !selected && "hover:border-primary/50"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MarkedWord option={option} />
        <div className="flex flex-wrap items-center gap-1">
          {option.best && <Badge variant="default">Suggested</Badge>}
          {!option.valid && (
            <Badge variant="outline" className="border-destructive text-destructive">
              Cannot be used
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{option.confidencePercent}% sure</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Pausal: <span className="font-arabic text-base" dir="rtl">{option.pausal}</span>
      </div>
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">{formLabel} syllables:</span>
        <div className="flex flex-wrap justify-start gap-1" dir="rtl">
          {option.split.units.map((unit) => (
            <div key={`${unit.id}-${unit.text}`} className="flex min-w-[48px] flex-col items-center gap-1 rounded-md border bg-background px-2 py-1">
              <span className="font-arabic text-xl">{unit.text}</span>
              <div className={cn("h-1 w-full rounded-full", kindBarClass(unit))} />
            </div>
          ))}
        </div>
      </div>
      <IssueList issues={option.problems} />
    </button>
  );
}

/**
 * "Suggest harakat" (SB-S2). Shows the suggestion and the other readings, each
 * with its split; nothing changes until the author presses Confirm.
 */
export function HarakatSuggestionPanel({
  reason,
  disabledReason,
  pending,
  offer,
  error,
  formLabel,
  onSuggest,
  onConfirm,
  onDismiss,
}: HarakatSuggestionPanelProps) {
  const options = offer && offer.kind !== "complete" ? offer.options : [];
  const firstValid = options.findIndex((o) => o.valid);
  const [selected, setSelected] = React.useState(firstValid);
  React.useEffect(() => setSelected(firstValid), [offer, firstValid]);
  const chosen = selected >= 0 ? options[selected] : undefined;

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{disabledReason ?? reason}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !!disabledReason}
          title={disabledReason ?? undefined}
          onClick={onSuggest}
        >
          {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          Suggest harakat
        </Button>
      </div>

      {error && !disabledReason && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          <span>{error.message}</span>
          <div className="flex gap-2">
            {error.retry && (
              <Button type="button" variant="outline" size="sm" onClick={onSuggest} disabled={pending}>
                <RotateCw className="mr-1 h-3.5 w-3.5" /> Try again
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
              Close
            </Button>
          </div>
        </div>
      )}

      {offer?.kind === "complete" && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>{COMPLETE_MESSAGE}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Close
          </Button>
        </div>
      )}

      {offer && offer.kind !== "complete" && (
        <div className="space-y-2">
          {offer.kind === "none" && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{NO_VALID_SUGGESTION_MESSAGE}</p>
          )}
          {offer.kind === "options" && options.length > 1 && (
            <p className="text-xs text-muted-foreground">
              The word can be read in more than one way. Pick the reading you mean. Highlighted letters get new marks.
            </p>
          )}
          {offer.kind === "options" && options.length === 1 && (
            <p className="text-xs text-muted-foreground">Highlighted letters get new marks.</p>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {options.map((option, i) => (
              <OptionCard
                key={option.text}
                option={option}
                selected={i === selected}
                formLabel={formLabel}
                onSelect={() => option.valid && setSelected(i)}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
              <X className="mr-1 h-4 w-4" /> Dismiss
            </Button>
            {chosen && (
              <Button type="button" size="sm" onClick={() => onConfirm(chosen.text)}>
                <Check className="mr-1 h-4 w-4" /> Confirm
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
