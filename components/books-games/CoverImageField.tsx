"use client";

/**
 * CoverImageField
 *
 * Reusable cover-image picker used by the book and game editors.
 * Wraps the shared ImageLibraryModal.
 */

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageLibraryModal } from "@/components/builder/forms/shared/ImageLibraryModal";
import { cn } from "@/lib/utils";

interface CoverImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  /** Aspect ratio class for the preview, e.g. "aspect-[3/4]" (books) or "aspect-video" (games) */
  aspectClassName?: string;
  className?: string;
}

export function CoverImageField({
  value,
  onChange,
  label = "Cover Image",
  required = false,
  aspectClassName = "aspect-[3/4]",
  className,
}: CoverImageFieldProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {value ? (
        <div className="space-y-2">
          <div
            className={cn(
              "relative w-40 overflow-hidden rounded-lg border",
              aspectClassName
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0"
              onClick={() => setPickerOpen(true)}
            >
              Change Image
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="px-0 text-destructive"
              onClick={() => onChange("")}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "flex w-40 flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary/50",
            aspectClassName
          )}
        >
          <ImageIcon className="h-8 w-8" />
          <span className="mt-2 px-2 text-center text-xs">
            Click to select image
          </span>
        </button>
      )}

      <ImageLibraryModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelectImage={(url) => {
          onChange(url);
          setPickerOpen(false);
        }}
        currentImage={value}
      />
    </div>
  );
}
