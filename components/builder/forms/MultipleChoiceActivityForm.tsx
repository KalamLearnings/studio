"use client";

import * as React from "react";
import {
  ModeToggle,
  ContentDisplayPicker,
  AnswerOptionsGrid,
  LetterSelector,
  WordSelector,
} from "./shared";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MultipleChoiceOption {
  id: string;
  text?: { en?: string; ar?: string };
  image?: string;
  letter?: LetterReference;
  isCorrect: boolean;
}

interface MultipleChoiceConfig {
  question?: { en?: string; ar?: string };
  questionImage?: string;
  targetLetter?: LetterReference;
  mode?: "letter" | "word" | "image";
  options?: MultipleChoiceOption[];
}

const CONTENT_TYPE_OPTIONS = [
  { value: "text" as const, label: "Letter/Word", icon: "📝" },
  { value: "image" as const, label: "Image", icon: "🖼️" },
];

const ANSWER_MODE_OPTIONS = [
  { value: "letter" as const, label: "Letter", icon: "أ" },
  { value: "word" as const, label: "Word", icon: "📝" },
  { value: "image" as const, label: "Image", icon: "🖼️" },
];

const generateOptionId = (index: number) => `option_${index}_${Date.now()}`;

export function MultipleChoiceActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<MultipleChoiceConfig>) {
  const { getLetter } = useLetters();

  const questionAr = config?.question?.ar || "";
  const questionImage = config?.questionImage || "";
  const mode = config?.mode || "letter";


  const [contentType, setContentType] = React.useState<"text" | "image">(
    questionImage ? "image" : "text"
  );
  const [letterModalOpen, setLetterModalOpen] = React.useState(false);
  const [wordModalOpen, setWordModalOpen] = React.useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = React.useState<number | null>(null);

  const initialOptions: MultipleChoiceOption[] =
    config?.options && config.options.length > 0
      ? config.options
      : [
          { id: generateOptionId(0), text: { en: "", ar: "" }, isCorrect: false },
          { id: generateOptionId(1), text: { en: "", ar: "" }, isCorrect: false },
          { id: generateOptionId(2), text: { en: "", ar: "" }, isCorrect: false },
          { id: generateOptionId(3), text: { en: "", ar: "" }, isCorrect: false },
        ];

  const [options, setOptions] = React.useState<MultipleChoiceOption[]>(initialOptions);

  const updateConfig = (updates: Partial<MultipleChoiceConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleContentTypeChange = (type: "text" | "image") => {
    setContentType(type);
    if (type === "image") {
      updateConfig({ question: { en: "", ar: "" }, targetLetter: undefined });
    } else {
      updateConfig({ questionImage: "" });
    }
  };

  const handleUpdateOption = (
    index: number,
    field: "text" | "image" | "isCorrect" | "letter",
    value: unknown
  ) => {
    const newOptions = [...options];
    if (field === "text") {
      newOptions[index].text = { en: "", ar: value as string };
    } else if (field === "image") {
      newOptions[index].image = value as string;
    } else if (field === "isCorrect") {
      newOptions[index].isCorrect = value as boolean;
    } else if (field === "letter") {
      newOptions[index].letter = value as LetterReference;
    }
    setOptions(newOptions);
    updateConfig({ options: newOptions });
  };

  const handleOpenLetterPicker = (index: number) => {
    setSelectedOptionIndex(index);
    setLetterModalOpen(true);
  };

  const handleOpenWordPicker = (index: number) => {
    setSelectedOptionIndex(index);
    setWordModalOpen(true);
  };

  const handleLetterSelect = (selected: LetterReference | LetterReference[] | null) => {
    if (selectedOptionIndex !== null && selected) {
      const letterRef = Array.isArray(selected) ? selected[0] : selected;
      handleUpdateOption(selectedOptionIndex, "letter", letterRef);
    }
    setLetterModalOpen(false);
  };

  const handleWordSelect = (word: string) => {
    if (selectedOptionIndex !== null) {
      handleUpdateOption(selectedOptionIndex, "text", word);
    }
    setWordModalOpen(false);
  };

  const optionData = options.map((opt) => ({
    id: opt.id,
    text: opt.text?.ar || "",
    image: opt.image,
    letter: opt.letter,
    letterDisplay: getLetterDisplayChar(opt.letter, getLetter),
    isCorrect: opt.isCorrect,
  }));

  return (
    <div className="space-y-6">
      <ModeToggle
        label="Display Above Options"
        value={contentType}
        options={CONTENT_TYPE_OPTIONS}
        onChange={handleContentTypeChange}
        borderBottom
      />

      <div className="space-y-4">
        {contentType === "text" ? (
          <WordSelector
            value={questionAr}
            onChange={(value) => updateConfig({ question: { en: "", ar: value } })}
            label="Letter or Word"
            placeholder="Type to search word library..."
          />
        ) : (
          <ContentDisplayPicker
            contentType="image"
            image={questionImage}
            onImageChange={(url) => updateConfig({ questionImage: url })}
            label="Question Image"
          />
        )}
      </div>

      <ModeToggle
        label="Answer Type"
        value={mode}
        options={ANSWER_MODE_OPTIONS}
        onChange={(newMode) => updateConfig({ mode: newMode })}
        borderTop
      />

      <AnswerOptionsGrid
        options={optionData}
        mode={mode}
        onUpdateOption={handleUpdateOption}
        title="Answer Options"
        showCorrectCheckbox
        columns={4}
        onOpenLetterPicker={handleOpenLetterPicker}
        onOpenWordPicker={handleOpenWordPicker}
      />

      {/* Letter Selector Modal */}
      {letterModalOpen && (
        <Dialog open={letterModalOpen} onOpenChange={setLetterModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Letter</DialogTitle>
            </DialogHeader>
            <LetterSelector
              value={selectedOptionIndex !== null ? options[selectedOptionIndex]?.letter || null : null}
              onChange={handleLetterSelect}
              topic={topic}
              showFormSelector
              showHarakaSelector
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Word Selector Modal */}
      {wordModalOpen && (
        <Dialog open={wordModalOpen} onOpenChange={setWordModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Select Word</DialogTitle>
            </DialogHeader>
            <WordSelector
              value={selectedOptionIndex !== null ? options[selectedOptionIndex]?.text?.ar || "" : ""}
              onChange={handleWordSelect}
              placeholder="Type to search word library..."
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
