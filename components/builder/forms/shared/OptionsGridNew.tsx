"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { OptionSquare, OptionSquareData, LetterRef } from "./OptionSquare";
import { ImageLibraryModal } from "./ImageLibraryModal";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OptionData extends OptionSquareData {
  id: string;
  text?: string;
  letter?: LetterRef;
  letterDisplay?: string;
  image?: string;
  isCorrect?: boolean;
}

interface OptionsGridProps {
  options: OptionData[];
  mode: "letter" | "word" | "image" | "text";
  onUpdateOption: (
    index: number,
    field: "text" | "image" | "isCorrect" | "letter",
    value: unknown
  ) => void;
  title?: string;
  showCorrectCheckbox?: boolean;
  columns?: 2 | 3 | 4;
  allowAddRemove?: boolean;
  onAddOption?: () => void;
  onRemoveOption?: (index: number) => void;
  minOptions?: number;
  maxOptions?: number;
  onOpenLetterPicker?: (index: number) => void;
  onOpenWordPicker?: (index: number) => void;
}

export function AnswerOptionsGrid({
  options,
  mode,
  onUpdateOption,
  title = "Options",
  showCorrectCheckbox = true,
  columns = 4,
  allowAddRemove = false,
  onAddOption,
  onRemoveOption,
  minOptions = 1,
  maxOptions = 4,
  onOpenLetterPicker,
  onOpenWordPicker,
}: OptionsGridProps) {
  const [imageModalOpen, setImageModalOpen] = React.useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = React.useState<
    number | null
  >(null);

  const openImagePicker = (index: number) => {
    setSelectedOptionIndex(index);
    setImageModalOpen(true);
  };

  const handleImageSelect = (url: string) => {
    if (selectedOptionIndex !== null) {
      onUpdateOption(selectedOptionIndex, "image", url);
    }
    setImageModalOpen(false);
  };

  const getGridCols = () => {
    switch (columns) {
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-4";
      default:
        return "grid-cols-4";
    }
  };

  const canAdd = allowAddRemove && options.length < maxOptions;
  const canRemove = allowAddRemove && options.length > minOptions;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {allowAddRemove && canAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAddOption}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Option
          </Button>
        )}
      </div>

      <div className={cn("grid gap-3 max-w-2xl", getGridCols())}>
        {options.map((option, index) => (
          <div key={option.id} className="relative">
            <OptionSquare
              option={option}
              index={index}
              mode={mode}
              showCorrectCheckbox={showCorrectCheckbox}
              onToggleCorrect={(checked) =>
                onUpdateOption(index, "isCorrect", checked)
              }
              onUpdateText={(value) => onUpdateOption(index, "text", value)}
              onOpenLetterPicker={() => onOpenLetterPicker?.(index)}
              onOpenWordPicker={() => onOpenWordPicker?.(index)}
              onOpenImagePicker={() => openImagePicker(index)}
              onClearImage={() => onUpdateOption(index, "image", "")}
              onClearLetter={() => onUpdateOption(index, "letter", null)}
            />
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemoveOption?.(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors"
                title="Remove option"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <ImageLibraryModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSelectImage={handleImageSelect}
        currentImage={
          selectedOptionIndex !== null
            ? options[selectedOptionIndex]?.image
            : undefined
        }
      />
    </div>
  );
}

// Keep backward compatible export
export { AnswerOptionsGrid as OptionsGridAnswers };
