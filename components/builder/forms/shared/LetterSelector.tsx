"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeftRight } from "lucide-react";
import {
  useLetters,
  type Letter,
  getLetterDisplayChar,
} from "@/lib/hooks/useLetters";
import { LetterFormHarakaPicker } from "@/components/builder/letter-picker";
import { HARAKA_META } from "@kalam/curriculum-schemas";
import type {
  LetterForm,
  LetterReference,
  TopicContext,
  HarakaType,
} from "../types";

const formLabels: Record<LetterForm, string> = {
  isolated: "Isolated",
  initial: "Initial",
  medial: "Medial",
  final: "Final",
};

type LetterFilterFn = (letter: Letter) => boolean;

interface LetterSelectorBaseProps {
  topic?: TopicContext | null;
  showFormSelector?: boolean;
  showHarakaSelector?: boolean;
  disabledLetterIds?: string[];
  disabledTooltip?: string;
  /** Filter function to show only specific letters (e.g., letterFilters.withDots) */
  letterFilter?: LetterFilterFn;
}

interface SingleSelectProps extends LetterSelectorBaseProps {
  multiSelect?: false;
  multiFormSelect?: boolean;
  value: LetterReference | LetterReference[] | null;
  onChange: (value: LetterReference | LetterReference[] | null) => void;
}

interface MultiSelectProps extends LetterSelectorBaseProps {
  multiSelect: true;
  multiFormSelect?: boolean;
  value: LetterReference[];
  onChange: (value: LetterReference[]) => void;
}

type LetterSelectorProps = SingleSelectProps | MultiSelectProps;

/** Normalize this component's polymorphic `value` into an array of refs. */
function toRefs(
  value: LetterReference | LetterReference[] | null,
): LetterReference[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Letter selector field: an inline display + "Change" button that opens a modal
 * containing the shared {@link LetterFormHarakaPicker}.
 *
 * Supports single letter, single-letter-multiple-forms, and multi-letter
 * selection. All picker UI lives in the shared component so this stays a thin
 * container responsible only for the field display, the modal, and converting
 * between the picker's `LetterReference[]` and this component's polymorphic
 * `value` contract (kept for backwards compatibility with consumers).
 */
export function LetterSelector(props: LetterSelectorProps) {
  const {
    topic,
    showFormSelector = true,
    showHarakaSelector = true,
    disabledLetterIds = [],
    disabledTooltip,
    letterFilter,
  } = props;

  const { getLetter } = useLetters();
  const [showModal, setShowModal] = useState(false);
  // Draft edited inside the modal; committed to the consumer on confirm.
  const [draft, setDraft] = useState<LetterReference[]>([]);
  const hasAutoPopulated = useRef(false);

  const isMultiSelect = props.multiSelect === true;
  const isMultiFormSelect = props.multiFormSelect === true;

  // Auto-populate from topic for single select - only run once
  useEffect(() => {
    if (hasAutoPopulated.current) return;
    if (!isMultiSelect && topic?.letter?.id) {
      const hasValue = toRefs(props.value).length > 0;
      if (!hasValue) {
        hasAutoPopulated.current = true;
        (props as SingleSelectProps).onChange({
          letterId: topic.letter.id,
          form: "isolated",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.letter?.id, isMultiSelect]);

  const openModal = () => {
    setDraft(toRefs(props.value));
    setShowModal(true);
  };

  const commit = () => {
    if (isMultiSelect) {
      (props as MultiSelectProps).onChange(draft);
    } else if (isMultiFormSelect) {
      (props as SingleSelectProps).onChange(draft);
    } else {
      (props as SingleSelectProps).onChange(draft[0] ?? null);
    }
    setShowModal(false);
  };

  const canConfirm = draft.length > 0;

  // ---- inline field display ----

  const renderDisplay = () => {
    const refs = toRefs(props.value);
    if (refs.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          {isMultiSelect ? "No letters selected" : "No letter selected"}
        </div>
      );
    }

    if (isMultiSelect) {
      const grouped = refs.reduce((acc, ref) => {
        (acc[ref.letterId] ??= []).push(ref.form);
        return acc;
      }, {} as Record<string, LetterForm[]>);

      return (
        <div className="flex flex-wrap gap-2">
          {Object.entries(grouped).map(([letterId, forms]) => {
            const letterData = getLetter(letterId);
            return (
              <div
                key={letterId}
                className="flex flex-col items-center rounded-lg border bg-background px-3 py-2 shadow-sm"
              >
                <span className="font-arabic text-2xl">
                  {letterData?.letter || "?"}
                </span>
                {isMultiFormSelect && (
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {forms.map((f) => formLabels[f].charAt(0)).join(", ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    const letterData = getLetter(refs[0].letterId);
    const displayChar = getLetterDisplayChar(refs[0], getLetter);
    const haraka = refs[0].haraka as HarakaType | undefined;

    return (
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-background shadow-sm">
          <span className="font-arabic text-3xl">{displayChar}</span>
        </div>
        <div>
          {letterData ? (
            <>
              <div className="text-sm font-medium">{letterData.name_english}</div>
              <div className="text-xs text-muted-foreground">
                {isMultiFormSelect
                  ? `${refs.map((r) => formLabels[r.form]).join(", ")} Form${refs.length > 1 ? "s" : ""}`
                  : `${formLabels[refs[0].form]} Form`}
                {haraka && ` + ${HARAKA_META[haraka].label}`}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Loading...</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex min-h-[76px] flex-1 items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          {renderDisplay()}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openModal}
          className="shrink-0"
        >
          <ArrowLeftRight className="mr-1 h-4 w-4" />
          Change
        </Button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isMultiSelect ? "Select Letters" : "Select Letter"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3">
            <LetterFormHarakaPicker
              mode={isMultiSelect ? "multi" : "single"}
              multiForm={isMultiFormSelect}
              value={draft}
              onChange={setDraft}
              showFormSelector={showFormSelector}
              showHarakaSelector={showHarakaSelector}
              disabledLetterIds={disabledLetterIds}
              disabledTooltip={disabledTooltip}
              letterFilter={letterFilter}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={commit} disabled={!canConfirm}>
              {isMultiSelect ? "Done" : "Select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
