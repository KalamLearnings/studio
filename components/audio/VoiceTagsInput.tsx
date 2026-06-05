"use client";

/**
 * VoiceTagsInput
 *
 * Textarea with voice tag insertion buttons for TTS text input
 * (emotion / tone / pause tags). Ported from v1, theme-aware.
 */

import * as React from "react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

const VOICE_TAGS = [
  // Language
  "[arabic]",
  // Emotions & Tones (for kids)
  "[excited]",
  "[happy]",
  "[cheerful]",
  "[encouraging]",
  "[proud]",
  "[calm]",
  "[gentle]",
  "[friendly]",
  "[playful]",
  "[curious]",
  "[surprised]",
  // Delivery styles
  "[whispers]",
  "[giggles]",
  // Pauses
  "[pause]",
  "[short pause]",
  "[long pause]",
] as const;

interface VoiceTagsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function VoiceTagsInput({
  value,
  onChange,
  placeholder = "Enter text...",
  dir = "rtl",
  rows = 3,
  className,
  disabled = false,
}: VoiceTagsInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current || disabled) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const before = value.substring(0, start);
    const after = value.substring(end);
    const needsLeadingSpace = before && !before.endsWith(" ");
    const newValue =
      before + (needsLeadingSpace ? " " : "") + tag + " " + after;

    onChange(newValue);

    // Restore focus and move cursor after the inserted tag
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length + (needsLeadingSpace ? 2 : 1);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background transition-all",
        isFocused ? "ring-2 ring-ring border-ring" : "border-input",
        className
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        dir={dir}
        rows={rows}
        disabled={disabled}
        className={cn(
          "w-full resize-none px-3 py-2 text-sm",
          "bg-transparent focus:outline-none",
          "placeholder:text-muted-foreground",
          dir === "rtl" && "font-arabic",
          disabled && "cursor-not-allowed opacity-50"
        )}
      />

      <div className="border-t bg-muted/40 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[10px] font-medium text-muted-foreground">
            Voice:
          </span>
          {VOICE_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleInsertTag(tag)}
              disabled={disabled}
              title={`Insert ${tag} tag`}
              className={cn(
                "rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-all",
                "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                "active:scale-95",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { VOICE_TAGS };
