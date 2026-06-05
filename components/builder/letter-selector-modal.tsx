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
import { Loader2 } from "lucide-react";
import { useLetters, type Letter } from "@/lib/hooks/useLetters";

export type LetterForm = "isolated" | "initial" | "medial" | "final";
export type TopicType = "lesson" | "review" | "quiz" | "assessment";

export interface LetterReference {
  letterId: string;
  form: LetterForm;
}

interface LetterSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (letter: Letter | null, form: LetterForm, topicType: TopicType, topicName?: string) => void;
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
  const { letters, loading } = useLetters();
  const [selectFromLetters, setSelectFromLetters] = React.useState(true);
  const [selectedLetter, setSelectedLetter] = React.useState<Letter | null>(null);
  const [selectedForm, setSelectedForm] = React.useState<LetterForm>("isolated");
  const [selectedTopicType, setSelectedTopicType] = React.useState<TopicType>("lesson");
  const [topicName, setTopicName] = React.useState("");

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectFromLetters(true);
      setSelectedLetter(null);
      setSelectedForm("isolated");
      setSelectedTopicType("lesson");
      setTopicName("");
    }
  }, [open]);

  const handleLetterClick = React.useCallback((letter: Letter) => {
    setSelectedLetter(letter);
  }, []);

  const handleFormClick = React.useCallback((form: LetterForm) => {
    setSelectedForm(form);
  }, []);

  const handleTopicTypeClick = React.useCallback((type: TopicType) => {
    setSelectedTopicType(type);
  }, []);

  const handleSelect = React.useCallback(() => {
    if (selectFromLetters && !selectedLetter) return;
    if (!selectFromLetters && !topicName.trim()) return;
    onSelect(
      selectFromLetters ? selectedLetter : null,
      selectedForm,
      selectedTopicType,
      selectFromLetters ? undefined : topicName.trim()
    );
    onOpenChange(false);
  }, [selectFromLetters, selectedLetter, selectedForm, selectedTopicType, topicName, onSelect, onOpenChange]);

  const canCreate = selectFromLetters ? !!selectedLetter : !!topicName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-4">
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
            <label className="block text-sm font-medium mb-1">
              Topic Type
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Optionally mark this topic as a review, quiz, or assessment
            </p>
            <div className="grid grid-cols-4 gap-2">
              {topicTypes.map((type) => {
                const isSelected = selectedTopicType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTopicTypeClick(type.id)}
                    className={cn(
                      "px-3 py-2 rounded-md border transition-all text-sm font-medium",
                      "hover:border-primary/50 hover:bg-primary/5",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card"
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

          {/* Letter Grid - Only shown when selectFromLetters is true */}
          {selectFromLetters && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select an Arabic Letter <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-10 gap-1.5">
                    {letters.map((letter) => {
                      const isSelected = selectedLetter?.id === letter.id;

                      return (
                        <button
                          key={letter.id}
                          type="button"
                          onClick={() => handleLetterClick(letter)}
                          className={cn(
                            "h-12 w-12 rounded-md border transition-all",
                            "flex flex-col items-center justify-center",
                            "hover:border-primary/50 hover:bg-primary/5",
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border bg-card"
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
              )}

              {/* Form Selector */}
              {showFormSelector && selectedLetter && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Letter Form for &ldquo;{selectedLetter.name_english}&rdquo;
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["isolated", "initial", "medial", "final"] as LetterForm[]).map(
                      (form) => {
                        const isSelected = selectedForm === form;
                        const formChar =
                          selectedLetter.forms?.[form] || selectedLetter.letter;

                        return (
                          <button
                            key={form}
                            type="button"
                            onClick={() => handleFormClick(form)}
                            className={cn(
                              "px-3 py-2 rounded-md border transition-all",
                              "flex flex-col items-center justify-center",
                              "hover:border-primary/50 hover:bg-primary/5",
                              isSelected
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border-border bg-card"
                            )}
                          >
                            <div className="text-xl font-arabic">
                              {formChar}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {formLabels[form]}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Selected Letter Preview */}
              {selectedLetter && (
                <div className="p-3 rounded-md bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-arabic">
                      {selectedLetter.forms?.[selectedForm] || selectedLetter.letter}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{selectedLetter.name_english}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedLetter.name_arabic} · {formLabels[selectedForm]} form
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
