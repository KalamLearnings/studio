"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useLetters,
  applyHaraka,
  type Letter,
} from "@/lib/hooks/useLetters";
import { LetterFormHarakaPicker } from "@/components/builder/letter-picker";
import type { LetterReference, HarakaType } from "@/components/builder/forms/types";

export type LetterForm = "isolated" | "initial" | "medial" | "final";
export type TopicType = "lesson" | "review" | "quiz" | "assessment";
export type Haraka = "none" | HarakaType;

interface LetterSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    letter: Letter | null,
    form: LetterForm,
    topicType: TopicType,
    topicName?: string,
    haraka?: Haraka,
  ) => void;
  title?: string;
  showFormSelector?: boolean;
}

const formLabels: Record<LetterForm, string> = {
  isolated: "Isolated",
  initial: "Initial",
  medial: "Medial",
  final: "Final",
};

const topicTypes: { id: TopicType; label: string }[] = [
  { id: "lesson", label: "Lesson" },
  { id: "review", label: "Review" },
  { id: "quiz", label: "Quiz" },
  { id: "assessment", label: "Assessment" },
];

export function LetterSelectorModal({
  open,
  onOpenChange,
  onSelect,
  title = "Select Letter for New Topic",
  showFormSelector = true,
}: LetterSelectorModalProps) {
  const { getLetter } = useLetters();
  const [selectFromLetters, setSelectFromLetters] = React.useState(true);
  // The picker is the source of truth for letter + form + haraka (single ref).
  const [selection, setSelection] = React.useState<LetterReference[]>([]);
  const [selectedTopicType, setSelectedTopicType] =
    React.useState<TopicType>("lesson");
  const [topicName, setTopicName] = React.useState("");

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectFromLetters(true);
      setSelection([]);
      setSelectedTopicType("lesson");
      setTopicName("");
    }
  }, [open]);

  const selectedRef = selection[0] ?? null;
  const selectedLetter = selectedRef ? getLetter(selectedRef.letterId) : null;
  const selectedForm: LetterForm = (selectedRef?.form as LetterForm) ?? "isolated";
  const selectedHaraka: Haraka = (selectedRef?.haraka as Haraka) ?? "none";

  const handleSelect = React.useCallback(() => {
    if (selectFromLetters && !selectedLetter) return;
    if (!selectFromLetters && !topicName.trim()) return;
    onSelect(
      selectFromLetters ? selectedLetter ?? null : null,
      selectedForm,
      selectedTopicType,
      selectFromLetters ? undefined : topicName.trim(),
      selectFromLetters ? selectedHaraka : undefined,
    );
    onOpenChange(false);
  }, [
    selectFromLetters,
    selectedLetter,
    selectedForm,
    selectedHaraka,
    selectedTopicType,
    topicName,
    onSelect,
    onOpenChange,
  ]);

  const canCreate = selectFromLetters ? !!selectedLetter : !!topicName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Select from Letters Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="select-from-letters" className="text-sm font-medium">
              Select from Letters
            </Label>
            <Switch
              id="select-from-letters"
              checked={selectFromLetters}
              onCheckedChange={setSelectFromLetters}
            />
          </div>

          {/* Topic Type Selector */}
          <div>
            <label className="mb-1 block text-sm font-medium">Topic Type</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Optionally mark this topic as a review, quiz, or assessment
            </p>
            <div className="grid grid-cols-4 gap-2">
              {topicTypes.map((type) => {
                const isSelected = selectedTopicType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedTopicType(type.id)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card",
                    )}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic Name - Only shown when selectFromLetters is false */}
          {!selectFromLetters && (
            <div>
              <Label htmlFor="topic-name" className="text-sm font-medium">
                Topic Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topic-name"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="Enter topic name"
                className="mt-1.5"
              />
            </div>
          )}

          {/* Shared letter + form + haraka picker (single-select) */}
          {selectFromLetters && (
            <>
              <LetterFormHarakaPicker
                value={selection}
                onChange={setSelection}
                showFormSelector={showFormSelector}
              />

              {/* Selected Letter Preview */}
              {selectedLetter && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="font-arabic text-3xl">
                      {applyHaraka(
                        selectedLetter.forms?.[selectedForm] ||
                          selectedLetter.letter,
                        selectedHaraka === "none" ? undefined : selectedHaraka,
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {selectedLetter.name_english}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedLetter.name_arabic} · {formLabels[selectedForm]}{" "}
                        form
                        {selectedHaraka !== "none" &&
                          ` · ${selectedHaraka.charAt(0).toUpperCase() + selectedHaraka.slice(1)}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!canCreate}>
            Create Topic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
