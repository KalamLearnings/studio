"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  useLetters,
  applyHaraka,
  type Letter,
} from "@/lib/hooks/useLetters";
import { HARAKA_META } from "@kalam/curriculum-schemas";
import type { LetterForm, LetterReference, HarakaType } from "../forms/types";

/**
 * Presentational, fully-controlled Arabic letter picker.
 *
 * Renders the letter grid + (optional) form cards + (optional) expandable
 * haraka popovers, and emits `LetterReference`s. It owns NO business logic and
 * NO modal chrome — containers (`LetterSelector`, `LetterSelectorModal`) wrap it.
 *
 * This is the single source of truth for the picker UI so the topic and activity
 * pickers can never drift apart. Haraka metadata comes from the shared
 * `curriculum-schemas` package (`HARAKA_META`), not re-declared locally.
 */

export const LETTER_FORMS: LetterForm[] = [
  "isolated",
  "initial",
  "medial",
  "final",
];

const FORM_LABELS: Record<LetterForm, string> = {
  isolated: "Isolated",
  initial: "Initial",
  medial: "Medial",
  final: "Final",
};

// "none" is a UI-only sentinel for "no diacritic"; it never reaches a LetterReference.
type HarakaChoice = HarakaType | "none";

const HARAKA_CHOICES: { id: HarakaChoice; label: string }[] = [
  { id: "none", label: "None" },
  ...(Object.keys(HARAKA_META) as HarakaType[]).map((h) => ({
    id: h,
    label: HARAKA_META[h].label,
  })),
];

const HARAKA_SHORT: Record<HarakaChoice, string> = {
  none: "",
  fatha: "F",
  damma: "D",
  kasra: "K",
  sukoon: "S",
  shadda: "Sh",
};

type LetterFilterFn = (letter: Letter) => boolean;

interface BaseProps {
  /** Restrict the visible letters (e.g. only letters with dots). */
  letterFilter?: LetterFilterFn;
  /** Letter ids that cannot be selected. */
  disabledLetterIds?: string[];
  disabledTooltip?: string;
  /** Show the form (isolated/initial/medial/final) selector. Default true. */
  showFormSelector?: boolean;
  /** Show the diacritic selector. Default true. */
  showHarakaSelector?: boolean;
}

interface SingleProps extends BaseProps {
  mode?: "single";
  /** Allow selecting multiple forms of the same letter. */
  multiForm?: boolean;
  value: LetterReference[];
  onChange: (value: LetterReference[]) => void;
}

interface MultiProps extends BaseProps {
  mode: "multi";
  multiForm?: boolean;
  value: LetterReference[];
  onChange: (value: LetterReference[]) => void;
}

export type LetterFormHarakaPickerProps = SingleProps | MultiProps;

function harakaOf(ref: LetterReference): HarakaChoice {
  return (ref.haraka as HarakaChoice) || "none";
}

export function LetterFormHarakaPicker(props: LetterFormHarakaPickerProps) {
  const {
    value,
    onChange,
    mode = "single",
    multiForm = false,
    letterFilter,
    disabledLetterIds = [],
    disabledTooltip,
    showFormSelector = true,
    showHarakaSelector = true,
  } = props;

  const { letters, loading } = useLetters();
  const isMulti = mode === "multi";

  // Which letter's forms/haraka are currently being edited.
  const [activeLetterId, setActiveLetterId] = React.useState<string | null>(
    value[0]?.letterId ?? null,
  );
  // Which form card is expanded for diacritic selection.
  const [expandedForm, setExpandedForm] = React.useState<LetterForm | null>(
    null,
  );

  const activeLetter = React.useMemo(
    () => letters.find((l) => l.id === activeLetterId) ?? null,
    [letters, activeLetterId],
  );

  const refsFor = React.useCallback(
    (letterId: string, form?: LetterForm) =>
      value.filter(
        (r) => r.letterId === letterId && (form ? r.form === form : true),
      ),
    [value],
  );

  const formsFor = (letterId: string): LetterForm[] =>
    refsFor(letterId).map((r) => r.form);

  const harakatFor = (letterId: string, form: LetterForm): HarakaChoice[] => {
    const hs = refsFor(letterId, form)
      .map(harakaOf)
      .filter((h, i, arr) => arr.indexOf(h) === i);
    return hs.length > 0 ? hs : ["none"];
  };

  // ---- mutations (emit new value arrays) ----

  const selectLetter = (letter: Letter) => {
    if (disabledLetterIds.includes(letter.id)) return;
    setActiveLetterId(letter.id);
    setExpandedForm(null);

    if (isMulti) {
      const exists = value.some((r) => r.letterId === letter.id);
      if (!exists) {
        onChange([...value, { letterId: letter.id, form: "isolated" }]);
      }
    } else {
      // Single letter: replace selection, reset to isolated/no-haraka.
      onChange([{ letterId: letter.id, form: "isolated" }]);
    }
  };

  const toggleForm = (form: LetterForm) => {
    if (!activeLetter) return;
    const letterId = activeLetter.id;

    if (multiForm) {
      const has = formsFor(letterId).includes(form);
      if (has) {
        // Keep at least one form.
        if (formsFor(letterId).length > 1) {
          onChange(
            value.filter((r) => !(r.letterId === letterId && r.form === form)),
          );
        }
      } else {
        onChange([...value, { letterId, form }]);
      }
    } else {
      // Single form: replace this letter's form, preserving its haraka.
      const haraka = refsFor(letterId)[0]?.haraka;
      const others = value.filter((r) => r.letterId !== letterId);
      onChange([...others, { letterId, form, ...(haraka && { haraka }) }]);
    }
  };

  const setHaraka = (form: LetterForm, haraka: HarakaChoice) => {
    if (!activeLetter) return;
    const letterId = activeLetter.id;

    if (multiForm) {
      // Toggle a haraka variant for this form (multi-haraka).
      const current = harakatFor(letterId, form);
      if (haraka === "none") {
        const kept = value.filter(
          (r) => !(r.letterId === letterId && r.form === form),
        );
        onChange([...kept, { letterId, form }]);
      } else if (current.includes(haraka)) {
        const next = value.filter(
          (r) =>
            !(r.letterId === letterId && r.form === form && harakaOf(r) === haraka),
        );
        if (!next.some((r) => r.letterId === letterId && r.form === form)) {
          next.push({ letterId, form });
        }
        onChange(next);
      } else {
        const withoutNone = value.filter(
          (r) =>
            !(r.letterId === letterId && r.form === form && !r.haraka),
        );
        onChange([...withoutNone, { letterId, form, haraka }]);
      }
    } else {
      // Single form, single haraka: replace this letter's ref.
      const refForm = refsFor(letterId)[0]?.form ?? form;
      const others = value.filter((r) => r.letterId !== letterId);
      onChange([
        ...others,
        { letterId, form: refForm, ...(haraka !== "none" && { haraka }) },
      ]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visibleLetters = letterFilter ? letters.filter(letterFilter) : letters;

  return (
    <div className="space-y-4">
      {/* Letter grid */}
      <div>
        <label className="mb-2 block text-sm font-medium">Arabic Letters</label>
        <div className="grid grid-cols-10 gap-1.5">
          {visibleLetters.map((letter) => {
            const isDisabled = disabledLetterIds.includes(letter.id);
            const isSelected = value.some((r) => r.letterId === letter.id);
            return (
              <button
                key={letter.id}
                type="button"
                onClick={() => selectLetter(letter)}
                disabled={isDisabled}
                title={isDisabled ? disabledTooltip : undefined}
                className={cn(
                  "flex h-12 w-12 flex-col items-center justify-center rounded-md border transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-card",
                  isDisabled && "cursor-not-allowed opacity-40",
                )}
              >
                <div className="font-arabic text-lg leading-none">
                  {letter.letter}
                </div>
                <div className="mt-0.5 text-[8px] leading-none text-muted-foreground">
                  {letter.name_english}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form + haraka cards */}
      {showFormSelector && activeLetter && (
        <div>
          <label className="mb-2 block text-sm font-medium">
            {isMulti
              ? `Select Forms for "${activeLetter.name_english}"`
              : "Letter Form"}
            {multiForm && " (select multiple)"}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {LETTER_FORMS.map((form) => {
              const isFormSelected = formsFor(activeLetter.id).includes(form);
              const formChar = activeLetter.forms?.[form] || activeLetter.letter;
              const harakat = harakatFor(activeLetter.id, form);
              const displayHaraka =
                harakat.find((h) => h !== "none") ?? "none";
              const isExpanded = expandedForm === form && isFormSelected;

              return (
                <div key={form} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      toggleForm(form);
                      if (showHarakaSelector && !isFormSelected) {
                        setExpandedForm(form);
                      } else if (isFormSelected && expandedForm === form) {
                        setExpandedForm(null);
                      }
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-t-md border px-3 py-3 transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isFormSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card",
                      !isFormSelected && "rounded-b-md",
                    )}
                  >
                    <div className="font-arabic text-xl">
                      {applyHaraka(
                        formChar,
                        displayHaraka === "none" ? undefined : displayHaraka,
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {FORM_LABELS[form]}
                    </div>
                    {isFormSelected &&
                      harakat.some((h) => h !== "none") && (
                        <span className="absolute right-1 top-1 rounded bg-primary px-1 text-[8px] text-primary-foreground">
                          {harakat
                            .filter((h) => h !== "none")
                            .map((h) => HARAKA_SHORT[h])
                            .join("+")}
                        </span>
                      )}
                    {isFormSelected && showHarakaSelector && (
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedForm(isExpanded ? null : form);
                        }}
                        className="absolute -bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary p-0.5 text-primary-foreground hover:bg-primary/90"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </button>

                  {isFormSelected && isExpanded && showHarakaSelector && (
                    <div className="space-y-1 rounded-b-md border border-t-0 border-primary bg-primary/5 p-2">
                      {multiForm && (
                        <p className="mb-1 text-center text-[9px] text-muted-foreground">
                          Select multiple
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-1">
                        {HARAKA_CHOICES.map(({ id, label }) => {
                          const isOn = harakat.includes(id);
                          const ch =
                            id === "none"
                              ? "∅"
                              : applyHaraka(formChar, id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHaraka(form, id);
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center rounded px-1 py-1 text-xs transition-all",
                                isOn
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border bg-background hover:border-primary/50",
                              )}
                            >
                              <div className="font-arabic text-sm leading-none">
                                {ch}
                              </div>
                              <div className="mt-0.5 text-[8px] leading-none">
                                {label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {showHarakaSelector && multiForm && (
            <p className="mt-2 text-xs text-muted-foreground">
              Click the arrow on a selected form to set its diacritics
            </p>
          )}
        </div>
      )}
    </div>
  );
}
