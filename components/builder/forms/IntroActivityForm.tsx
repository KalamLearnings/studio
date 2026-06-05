"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FormField,
  NumberInput,
  LetterSelector,
  ImageLibraryModal,
  WordSelector,
} from "./shared";
import type { BaseActivityFormProps, IntroActivityConfig } from "./types";

const CONTENT_TYPES = [
  {
    value: "letter",
    label: "Letter",
    icon: (
      <span className="text-2xl font-arabic">&#1571;</span>
    ),
  },
  {
    value: "word",
    label: "Word",
    icon: (
      <span className="text-2xl font-arabic">&#1603;&#1604;&#1605;&#1577;</span>
    ),
  },
  {
    value: "image",
    label: "Image",
    icon: (
      <svg
        className="w-7 h-7 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

/**
 * Form for show_letter_or_word activity.
 * Allows displaying a letter, word, or image as introductory content.
 */
export function IntroActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<IntroActivityConfig>) {
  const [showImageLibrary, setShowImageLibrary] = React.useState(false);

  const contentType = config?.contentType || "letter";
  const targetLetter = config?.targetLetter || null;
  const word = config?.word || "";
  const image = config?.image || "";
  const imageWidth = config?.imageWidth || 300;
  const imageHeight = config?.imageHeight || 300;

  const updateConfig = (updates: Partial<IntroActivityConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Content Type"
        hint="What to display in this activity"
        required
      >
        <div className="grid grid-cols-3 gap-3">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                updateConfig({
                  contentType: type.value as IntroActivityConfig["contentType"],
                })
              }
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                contentType === type.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {type.icon}
              <span className="text-xs font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </FormField>

      {contentType === "letter" && (
        <FormField
          label="Letter"
          hint="Select the Arabic letter and form to display"
          required
        >
          <LetterSelector
            value={targetLetter}
            onChange={(value) =>
              updateConfig({
                targetLetter: Array.isArray(value) ? value[0] : value,
              })
            }
            topic={topic}
            showFormSelector={true}
          />
        </FormField>
      )}

      {contentType === "word" && (
        <WordSelector
          value={word}
          onChange={(value) => updateConfig({ word: value })}
          label="Word"
          required
          placeholder="Type to search word library..."
        />
      )}

      {contentType === "image" && (
        <>
          <FormField label="Image" hint="Select image from library" required>
            {image ? (
              <div className="relative inline-block">
                <img
                  src={image}
                  alt="Display"
                  className="max-w-xs max-h-48 rounded-lg border-2 object-contain"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowImageLibrary(true)}
                    className="px-0"
                  >
                    Change Image
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => updateConfig({ image: "" })}
                    className="px-0 text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowImageLibrary(true)}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors w-full max-w-xs"
              >
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-sm text-muted-foreground">
                  Click to select image
                </p>
              </button>
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Image Width" hint="Width in pixels (optional)">
              <NumberInput
                value={imageWidth}
                onChange={(value) => updateConfig({ imageWidth: value })}
                min={50}
                max={1000}
                placeholder="300"
              />
            </FormField>

            <FormField label="Image Height" hint="Height in pixels (optional)">
              <NumberInput
                value={imageHeight}
                onChange={(value) => updateConfig({ imageHeight: value })}
                min={50}
                max={1000}
                placeholder="300"
              />
            </FormField>
          </div>
        </>
      )}

      <ImageLibraryModal
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        onSelectImage={(url) => {
          updateConfig({ image: url });
          setShowImageLibrary(false);
        }}
        currentImage={image}
      />
    </div>
  );
}
