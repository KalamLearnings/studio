"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { useLetters, type Letter, letterFilters, applyHaraka, getLetterDisplayChar } from "@/lib/hooks/useLetters";
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

type ExtendedHarakaType = HarakaType | "none";

const harakaLabels: Record<ExtendedHarakaType, string> = {
  none: "None",
  fatha: "Fatha",
  damma: "Damma",
  kasra: "Kasra",
  sukoon: "Sukoon",
  shadda: "Shadda",
};

const harakaShortLabels: Record<ExtendedHarakaType, string> = {
  none: "",
  fatha: "F",
  damma: "D",
  kasra: "K",
  sukoon: "S",
  shadda: "Sh",
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

/**
 * Letter selector component with modal picker.
 * Supports single letter, single letter with multiple forms, and multi-letter selection.
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

  const { letters, loading, getLetter } = useLetters();
  const [showModal, setShowModal] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [selectedForms, setSelectedForms] = useState<LetterForm[]>(["isolated"]);
  const [selectedHaraka, setSelectedHaraka] = useState<ExtendedHarakaType>("none");
  // Track last clicked letter in multi-select mode for form selection
  const [lastClickedLetter, setLastClickedLetter] = useState<Letter | null>(null);
  const hasAutoPopulated = useRef(false);

  const isMultiSelect = props.multiSelect === true;
  const isMultiFormSelect = props.multiFormSelect === true;

  // Track which form card is expanded for diacritic selection
  const [expandedForm, setExpandedForm] = useState<LetterForm | null>(null);

  // Auto-populate from topic for single select - only run once
  useEffect(() => {
    if (hasAutoPopulated.current) return;
    if (!isMultiSelect && topic?.letter?.id) {
      const currentValue = props.value as LetterReference | LetterReference[] | null;
      const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : !!currentValue;

      if (!hasValue) {
        hasAutoPopulated.current = true;
        (props as SingleSelectProps).onChange({
          letterId: topic.letter.id,
          form: "isolated",
        });
      }
    }
  }, [topic?.letter?.id, isMultiSelect]);

  // Get display character for a letter reference (with optional haraka)
  const getDisplayChar = (ref: LetterReference): string => {
    return getLetterDisplayChar(ref, getLetter);
  };

  // Handle modal open - pre-populate with current selection
  const handleOpenModal = () => {
    if (isMultiSelect) {
      // For multi-select, just open the modal
    } else {
      const value = props.value as LetterReference | LetterReference[] | null;
      if (value) {
        const refs = Array.isArray(value) ? value : [value];
        if (refs.length > 0) {
          const letter = getLetter(refs[0].letterId);
          setSelectedLetter(letter || null);
          setSelectedForms(refs.map((r) => r.form));
          setSelectedHaraka((refs[0].haraka as ExtendedHarakaType) || "none");
        }
      }
    }
    setShowModal(true);
  };

  // Get forms selected for a specific letter in multi-select mode
  const getFormsForLetter = (letterId: string): LetterForm[] => {
    const currentRefs = props.value as LetterReference[];
    return currentRefs.filter((r) => r.letterId === letterId).map((r) => r.form);
  };

  // Get all harakaat for a specific form of a letter (for multi-haraka selection)
  const getHarakaatForForm = (letterId: string, form: LetterForm): ExtendedHarakaType[] => {
    const currentRefs = props.value as LetterReference[];
    const matchingRefs = currentRefs.filter((r) => r.letterId === letterId && r.form === form);
    const harakaat = matchingRefs
      .map((r) => (r.haraka as ExtendedHarakaType) || "none")
      .filter((h, i, arr) => arr.indexOf(h) === i); // unique
    return harakaat.length > 0 ? harakaat : ["none"];
  };

  // Toggle haraka for a specific form of a letter (multi-select harakaat)
  const toggleHarakaForForm = (letterId: string, form: LetterForm, haraka: ExtendedHarakaType) => {
    const currentRefs = props.value as LetterReference[];
    const currentHarakaat = getHarakaatForForm(letterId, form);
    const hasHaraka = currentHarakaat.includes(haraka);

    if (haraka === "none") {
      // "None" is special - remove all harakaat variants for this form, keep one with no haraka
      const refsWithoutThisForm = currentRefs.filter(
        (ref) => !(ref.letterId === letterId && ref.form === form)
      );
      const newRefs = [...refsWithoutThisForm, { letterId, form }];
      (props as MultiSelectProps).onChange(newRefs);
    } else if (hasHaraka) {
      // Remove this haraka variant
      const newRefs = currentRefs.filter(
        (ref) => !(ref.letterId === letterId && ref.form === form && (ref.haraka || "none") === haraka)
      );
      // Ensure at least one ref remains for this form
      const stillHasForm = newRefs.some((r) => r.letterId === letterId && r.form === form);
      if (!stillHasForm) {
        newRefs.push({ letterId, form });
      }
      (props as MultiSelectProps).onChange(newRefs);
    } else {
      // Add this haraka variant
      // First, remove any "none" variant if adding a real haraka
      const refsWithoutNone = currentRefs.filter(
        (ref) => !(ref.letterId === letterId && ref.form === form && !ref.haraka)
      );
      const newRefs = [...refsWithoutNone, { letterId, form, haraka }];
      (props as MultiSelectProps).onChange(newRefs);
    }
  };

  // Handle letter selection in modal
  const handleLetterClick = (letter: Letter) => {
    if (disabledLetterIds.includes(letter.id)) return;

    if (isMultiSelect) {
      // For multi-select, toggle the letter or just select it for form editing
      const currentRefs = props.value as LetterReference[];
      const exists = currentRefs.some((r) => r.letterId === letter.id);

      if (exists) {
        // If clicking same letter again, just set it as last clicked for form editing
        if (lastClickedLetter?.id === letter.id) {
          // Remove all refs for this letter
          const newRefs = currentRefs.filter((r) => r.letterId !== letter.id);
          (props as MultiSelectProps).onChange(newRefs);
          setLastClickedLetter(null);
        } else {
          // Set as last clicked to edit its forms
          setLastClickedLetter(letter);
        }
      } else {
        // Add with isolated form and set as last clicked
        const newRefs = [...currentRefs, { letterId: letter.id, form: "isolated" as LetterForm }];
        (props as MultiSelectProps).onChange(newRefs);
        setLastClickedLetter(letter);
      }
    } else {
      setSelectedLetter(letter);
      setSelectedForms(["isolated"]);
      setSelectedHaraka("none");
    }
  };

  // Handle form selection in modal
  const handleFormToggle = (form: LetterForm) => {
    if (isMultiSelect && lastClickedLetter && isMultiFormSelect) {
      // Multi-select + multi-form mode - toggle form for last clicked letter
      const currentRefs = props.value as LetterReference[];
      const letterForms = getFormsForLetter(lastClickedLetter.id);

      if (letterForms.includes(form)) {
        // Remove this form (but keep at least one)
        if (letterForms.length > 1) {
          const newRefs = currentRefs.filter(
            (ref) => !(ref.letterId === lastClickedLetter.id && ref.form === form)
          );
          (props as MultiSelectProps).onChange(newRefs);
        }
      } else {
        // Add this form
        const newRefs = [...currentRefs, { letterId: lastClickedLetter.id, form }];
        (props as MultiSelectProps).onChange(newRefs);
      }
    } else if (isMultiFormSelect) {
      // Single letter + multi-form mode - toggle form in state
      setSelectedForms((prev) =>
        prev.includes(form)
          ? prev.filter((f) => f !== form)
          : [...prev, form]
      );
    } else {
      // Single form selection
      setSelectedForms([form]);
    }
  };

  // Handle confirm selection
  const handleConfirm = () => {
    if (!selectedLetter || selectedForms.length === 0) return;

    const haraka = selectedHaraka === "none" ? undefined : selectedHaraka;
    const refs: LetterReference[] = selectedForms.map((form) => ({
      letterId: selectedLetter.id,
      form,
      ...(haraka && { haraka }),
    }));

    if (isMultiFormSelect) {
      (props as SingleSelectProps).onChange(refs);
    } else {
      (props as SingleSelectProps).onChange(refs[0]);
    }

    setShowModal(false);
    setSelectedLetter(null);
    setSelectedForms(["isolated"]);
    setSelectedHaraka("none");
  };

  // Render display based on mode
  const renderDisplay = () => {
    if (isMultiSelect) {
      const refs = props.value as LetterReference[];
      if (refs.length === 0) {
        return (
          <div className="text-sm text-muted-foreground">No letters selected</div>
        );
      }

      // Group by letter
      const grouped = refs.reduce((acc, ref) => {
        if (!acc[ref.letterId]) acc[ref.letterId] = [];
        acc[ref.letterId].push(ref.form);
        return acc;
      }, {} as Record<string, LetterForm[]>);

      return (
        <div className="flex flex-wrap gap-2">
          {Object.entries(grouped).map(([letterId, forms]) => {
            const letterData = getLetter(letterId);
            return (
              <div
                key={letterId}
                className="flex flex-col items-center px-3 py-2 bg-background rounded-lg shadow-sm border"
              >
                <span className="text-2xl font-arabic">{letterData?.letter || "?"}</span>
                {isMultiFormSelect && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {forms.map((f) => formLabels[f].charAt(0)).join(", ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      const value = props.value as LetterReference | LetterReference[] | null;
      const refs = Array.isArray(value) ? value : value ? [value] : [];

      if (refs.length === 0) {
        return (
          <div className="text-sm text-muted-foreground">No letter selected</div>
        );
      }

      const letterData = getLetter(refs[0].letterId);
      const displayChar = getDisplayChar(refs[0]);

      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 bg-background rounded-lg shadow-sm border">
            <span className="text-3xl font-arabic">{displayChar}</span>
          </div>
          <div>
            {letterData ? (
              <>
                <div className="text-sm font-medium">{letterData.name_english}</div>
                <div className="text-xs text-muted-foreground">
                  {isMultiFormSelect
                    ? `${refs.map((r) => formLabels[r.form]).join(", ")} Form${refs.length > 1 ? "s" : ""}`
                    : `${formLabels[refs[0].form]} Form`}
                  {refs[0].haraka && ` + ${harakaLabels[refs[0].haraka as ExtendedHarakaType]}`}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Letter Display */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border rounded-lg flex-1 min-h-[76px]">
          {renderDisplay()}
        </div>

        {/* Change Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenModal}
          className="shrink-0"
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" />
          Change
        </Button>
      </div>

      {/* Letter Selector Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isMultiSelect ? "Select Letters" : "Select Letter"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Letter Grid */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Arabic Letters
                  </label>
                  <div className="grid grid-cols-10 gap-1.5">
                    {letters.filter(letterFilter || (() => true)).map((letter) => {
                      const isDisabled = disabledLetterIds.includes(letter.id);
                      const isSelected = isMultiSelect
                        ? (props.value as LetterReference[]).some(
                            (r) => r.letterId === letter.id
                          )
                        : selectedLetter?.id === letter.id;

                      return (
                        <button
                          key={letter.id}
                          type="button"
                          onClick={() => handleLetterClick(letter)}
                          disabled={isDisabled}
                          title={isDisabled ? disabledTooltip : undefined}
                          className={cn(
                            "h-12 w-12 rounded-md border transition-all",
                            "flex flex-col items-center justify-center",
                            "hover:border-primary/50 hover:bg-primary/5",
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border bg-card",
                            isDisabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <div className="text-lg font-arabic leading-none">
                            {letter.letter}
                          </div>
                          <div className="text-[8px] text-muted-foreground leading-none mt-0.5">
                            {letter.name_english}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Selector with Expandable Cards - shows for single select OR multi-select when a letter is clicked */}
                {showFormSelector && (
                  (isMultiSelect && lastClickedLetter) || (!isMultiSelect && selectedLetter)
                ) && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {isMultiSelect && lastClickedLetter
                        ? `Select Forms for "${lastClickedLetter.name_english}"`
                        : "Letter Form"}
                      {isMultiFormSelect && " (select multiple)"}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["isolated", "initial", "medial", "final"] as LetterForm[]).map(
                        (form) => {
                          const letterForForm = isMultiSelect ? lastClickedLetter : selectedLetter;
                          const isSelected = isMultiSelect && lastClickedLetter
                            ? getFormsForLetter(lastClickedLetter.id).includes(form)
                            : selectedForms.includes(form);
                          const formChar =
                            letterForForm?.forms?.[form] || letterForForm?.letter || "?";
                          const isExpanded = expandedForm === form && isSelected;
                          const currentHarakaat = isMultiSelect && lastClickedLetter
                            ? getHarakaatForForm(lastClickedLetter.id, form)
                            : [selectedHaraka];
                          // For display, show first non-none haraka
                          const displayHaraka = currentHarakaat.find(h => h !== "none") || "none";

                          return (
                            <div key={form} className="flex flex-col">
                              {/* Form Card */}
                              <button
                                type="button"
                                onClick={() => {
                                  handleFormToggle(form);
                                  // If selecting and showHarakaSelector, expand for diacritic selection
                                  if (showHarakaSelector && !isSelected) {
                                    setExpandedForm(form);
                                  } else if (isSelected && expandedForm === form) {
                                    setExpandedForm(null);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-3 rounded-t-md border transition-all",
                                  "flex flex-col items-center justify-center relative",
                                  "hover:border-primary/50 hover:bg-primary/5",
                                  isSelected
                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                    : "border-border bg-card",
                                  !isSelected && "rounded-b-md"
                                )}
                              >
                                <div className="text-xl font-arabic">
                                  {applyHaraka(formChar, displayHaraka === "none" ? undefined : displayHaraka as HarakaType)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formLabels[form]}
                                </div>
                                {/* Show haraka badges if selected (multiple) */}
                                {isSelected && currentHarakaat.some(h => h !== "none") && (
                                  <span className="absolute top-1 right-1 text-[8px] bg-primary text-primary-foreground px-1 rounded">
                                    {currentHarakaat.filter(h => h !== "none").map(h => harakaShortLabels[h]).join("+")}
                                  </span>
                                )}
                                {/* Expand/collapse indicator for selected forms */}
                                {isSelected && showHarakaSelector && isMultiFormSelect && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedForm(isExpanded ? null : form);
                                    }}
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded-full p-0.5 hover:bg-primary/90 z-10"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                )}
                              </button>

                              {/* Expanded Diacritic Selector (multi-select) */}
                              {isSelected && isExpanded && showHarakaSelector && (
                                <div className="border border-t-0 border-primary rounded-b-md bg-primary/5 p-2 space-y-1">
                                  <p className="text-[9px] text-muted-foreground text-center mb-1">Select multiple</p>
                                  <div className="grid grid-cols-3 gap-1">
                                    {(["none", "fatha", "damma", "kasra", "sukoon", "shadda"] as ExtendedHarakaType[]).map(
                                      (haraka) => {
                                        const isHarakaSelected = currentHarakaat.includes(haraka);
                                        const displayChar =
                                          haraka === "none"
                                            ? "∅"
                                            : applyHaraka(formChar, haraka as HarakaType);

                                        return (
                                          <button
                                            key={haraka}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isMultiSelect && lastClickedLetter) {
                                                toggleHarakaForForm(lastClickedLetter.id, form, haraka);
                                              } else {
                                                setSelectedHaraka(haraka);
                                              }
                                            }}
                                            className={cn(
                                              "px-1 py-1 rounded text-xs transition-all",
                                              "flex flex-col items-center justify-center",
                                              isHarakaSelected
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background border border-border hover:border-primary/50"
                                            )}
                                          >
                                            <div className="text-sm font-arabic leading-none">{displayChar}</div>
                                            <div className="text-[8px] leading-none mt-0.5">{harakaLabels[haraka]}</div>
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                    {showHarakaSelector && isMultiFormSelect && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Click the arrow on selected forms to set individual diacritics
                      </p>
                    )}
                  </div>
                )}


                {/* Preview */}
                {!isMultiSelect && selectedLetter && (
                  <div className="p-3 rounded-md bg-muted/50 border">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-arabic">
                        {applyHaraka(
                          selectedLetter.forms?.[selectedForms[0]] ||
                            selectedLetter.letter,
                          selectedHaraka === "none" ? undefined : selectedHaraka as HarakaType
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {selectedLetter.name_english}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedLetter.name_arabic} -{" "}
                          {selectedForms.map((f) => formLabels[f]).join(", ")}
                          {selectedHaraka !== "none" && ` + ${harakaLabels[selectedHaraka]}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            {isMultiSelect ? (
              <Button onClick={() => setShowModal(false)}>Done</Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={!selectedLetter || selectedForms.length === 0}
              >
                Select
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
