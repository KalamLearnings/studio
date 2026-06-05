"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, TextInput } from "./FormField";
import { ImageLibraryModal } from "./ImageLibraryModal";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";

export type ContentType = "letter" | "word" | "image";

interface ContentDisplayPickerProps {
  contentType: ContentType;
  letter?: string;
  word?: string;
  image?: string;
  onLetterChange?: (value: string) => void;
  onWordChange?: (value: string) => void;
  onImageChange?: (url: string) => void;
  letterPlaceholder?: string;
  wordPlaceholder?: string;
  label?: string;
  hint?: string;
}

export function ContentDisplayPicker({
  contentType,
  letter = "",
  word = "",
  image = "",
  onLetterChange,
  onWordChange,
  onImageChange,
  letterPlaceholder = "أ",
  wordPlaceholder = "كلمة",
  label,
  hint,
}: ContentDisplayPickerProps) {
  const [imageModalOpen, setImageModalOpen] = React.useState(false);

  const handleImageSelect = (url: string) => {
    onImageChange?.(url);
    setImageModalOpen(false);
  };

  if (contentType === "letter") {
    return (
      <FormField label={label || "Letter"} hint={hint || "Single letter to display"}>
        <TextInput
          value={letter}
          onChange={(value) => onLetterChange?.(value)}
          placeholder={letterPlaceholder}
          dir="rtl"
        />
      </FormField>
    );
  }

  if (contentType === "word") {
    return (
      <FormField label={label || "Word"} hint={hint || "Word to display"}>
        <TextInput
          value={word}
          onChange={(value) => onWordChange?.(value)}
          placeholder={wordPlaceholder}
          dir="rtl"
        />
      </FormField>
    );
  }

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">
          {label || "Image"}
        </label>
        {image ? (
          <div className="relative inline-block">
            <img
              src={image}
              alt="Display"
              className="max-w-xs max-h-48 rounded-lg border-2 border-border"
            />
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setImageModalOpen(true)}
                className="px-0"
              >
                Change Image
              </Button>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => onImageChange?.("")}
                className="px-0 text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setImageModalOpen(true)}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors w-full max-w-xs"
          >
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click to select image</p>
          </button>
        )}
      </div>

      <ImageLibraryModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onSelectImage={handleImageSelect}
        currentImage={image}
      />
    </>
  );
}
