"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

export interface LetterRef {
  letterId: string;
  form: "isolated" | "initial" | "medial" | "final";
}

export interface OptionSquareData {
  id: string;
  text?: string;
  letter?: LetterRef;
  image?: string;
  isCorrect?: boolean;
  letterDisplay?: string;
}

interface OptionSquareProps {
  option: OptionSquareData;
  index: number;
  mode: "letter" | "word" | "image" | "text";
  onToggleCorrect?: (checked: boolean) => void;
  onUpdateText?: (value: string) => void;
  onOpenLetterPicker?: () => void;
  onOpenWordPicker?: () => void;
  onOpenImagePicker?: () => void;
  onClearImage?: () => void;
  onClearLetter?: () => void;
  showCorrectCheckbox?: boolean;
  placeholder?: string;
}

export function OptionSquare({
  option,
  index,
  mode,
  onToggleCorrect,
  onUpdateText,
  onOpenLetterPicker,
  onOpenWordPicker,
  onOpenImagePicker,
  onClearImage,
  onClearLetter,
  showCorrectCheckbox = true,
  placeholder,
}: OptionSquareProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [textValue, setTextValue] = React.useState(option.text || "");

  const isTextMode = mode === "text";
  const isWordMode = mode === "word";

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (mode) {
      case "letter":
        return "أ";
      case "word":
      case "text":
        return "كلمة";
      default:
        return "";
    }
  };

  const handleSaveText = () => {
    onUpdateText?.(textValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveText();
    } else if (e.key === "Escape") {
      setTextValue(option.text || "");
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    if (mode === "letter") {
      onOpenLetterPicker?.();
    } else if (mode === "word") {
      // Word mode opens WordSelector modal
      onOpenWordPicker?.();
    } else if (mode === "text") {
      // Text mode uses inline editing
      setIsEditing(true);
    } else {
      onOpenImagePicker?.();
    }
  };

  return (
    <div className="relative">
      {showCorrectCheckbox && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Checkbox
            checked={option.isCorrect || false}
            onCheckedChange={(checked) => onToggleCorrect?.(!!checked)}
            className="h-3.5 w-3.5"
          />
          <label className="text-xs text-muted-foreground">
            {index + 1}
            {option.isCorrect && (
              <span className="ml-1 text-green-600">✓</span>
            )}
          </label>
        </div>
      )}

      <div
        className={cn(
          "aspect-square border-2 rounded-lg overflow-hidden",
          "bg-muted/30 flex items-center justify-center",
          "cursor-pointer hover:border-primary/50 transition-colors",
          option.isCorrect ? "border-green-400" : "border-border"
        )}
        onClick={handleClick}
      >
        {mode === "letter" ? (
          option.letter || option.letterDisplay ? (
            <div className="relative w-full h-full group flex items-center justify-center">
              <div
                className="text-4xl font-arabic font-semibold"
                dir="rtl"
              >
                {option.letterDisplay || "?"}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearLetter?.();
                }}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs text-center px-2">
              <div className="text-2xl mb-1 font-arabic">أ</div>
              Click to select
            </div>
          )
        ) : isWordMode ? (
          // Word mode - click to open WordSelector modal
          option.text ? (
            <div className="relative w-full h-full group flex items-center justify-center">
              <div
                className="font-semibold p-1 text-center text-2xl font-arabic"
                dir="rtl"
              >
                {option.text}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateText?.("");
                }}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs text-center px-2">
              <div className="text-2xl mb-1 font-arabic">كلمة</div>
              Click to select
            </div>
          )
        ) : isTextMode ? (
          // Text mode - inline editing
          isEditing ? (
            <div className="text-center px-2">
              <input
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onBlur={handleSaveText}
                onKeyDown={handleKeyDown}
                dir="rtl"
                autoFocus
                className="text-center text-2xl font-semibold bg-transparent outline-none w-full"
                placeholder={getPlaceholder()}
              />
            </div>
          ) : option.text ? (
            <div
              className="font-semibold p-1 text-center text-2xl"
              dir="rtl"
            >
              {option.text}
            </div>
          ) : (
            <div className="text-muted-foreground text-xs text-center px-2">
              Click to add
            </div>
          )
        ) : option.image ? (
          <div className="relative w-full h-full group">
            <img
              src={option.image}
              alt={`Option ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearImage?.();
              }}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="text-muted-foreground text-xs text-center px-2">
            <div className="text-2xl mb-1">📸</div>
            Click
          </div>
        )}
      </div>
    </div>
  );
}
