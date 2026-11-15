"use client";

import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Image, Volume2 } from "lucide-react";
import { useWords, type Word } from "@/lib/hooks/useWords";
import { plainSpellingIssue, previewWordSpelling } from "@/lib/words/spelling";
import { compositionLetterId } from "@/lib/words/composition";

// Words are loaded into the dropdown a page at a time; scrolling near the
// bottom reveals the next page (client-side, the full list is already in memory).
const PAGE_SIZE = 50;

interface WordSelectorProps {
  value: string;
  onChange: (word: string, wordData?: Word) => void;
  label?: string;
  required?: boolean;
  showTranslation?: boolean;
  onTranslationChange?: (translation: string) => void;
  translationValue?: string;
  className?: string;
  placeholder?: string;
  /** The server's refusal of the word on the last save (WORD_SPELLING_INVALID), one line each. */
  error?: string[];
}

export function WordSelector({
  value,
  onChange,
  label = "Word",
  required = false,
  showTranslation = false,
  onTranslationChange,
  translationValue = "",
  className = "",
  placeholder = "Type to search or enter new word...",
  error: fieldError,
}: WordSelectorProps) {
  const { words, loading, error } = useWords();
  const [inputValue, setInputValue] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find if the current value matches an existing word
  const selectedWord = words.find((w) => w.arabic === value);

  // Filter words based on input. With an empty field, show the full library
  // so the field acts as a browsable dropdown of all words.
  const filteredWords = inputValue.trim()
    ? words.filter(
        (word) =>
          word.arabic.includes(inputValue) ||
          word.english?.toLowerCase().includes(inputValue.toLowerCase()) ||
          word.transliteration?.toLowerCase().includes(inputValue.toLowerCase())
      )
    : words;

  // Check if input exactly matches an existing word
  const exactMatch = words.find((w) => w.arabic === inputValue);

  // What saving this text does to the library (CM-S1): the backend reuses the
  // row with the same normalised spelling, or creates one stored normalised.
  const spellingPreview = useMemo(() => previewWordSpelling(value || "", words), [value, words]);

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Reset to the first page whenever the result set changes or the dropdown
  // (re)opens, so a fresh search always starts at the top.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [inputValue, showDropdown]);

  // Reveal the next page when the dropdown is scrolled near the bottom.
  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setVisibleCount((prev) =>
        prev < filteredWords.length ? prev + PAGE_SIZE : prev
      );
    }
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    // Commit on every keystroke so a Save click never races the blur commit.
    onChange(text);
    setShowDropdown(true);
    setFocusedIndex(-1);
  };

  const handleSelectWord = (word: Word) => {
    setInputValue(word.arabic);
    onChange(word.arabic, word);
    if (showTranslation && onTranslationChange && word.english) {
      onTranslationChange(word.english);
    }
    setShowDropdown(false);
    setFocusedIndex(-1);
  };

  const handleInputBlur = () => {
    // Delay only the dropdown close so dropdown clicks can land; the value
    // itself is already committed on each keystroke.
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredWords.length === 0) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        // Reveal the next page when arrowing to the edge of the visible window.
        const lastVisible = Math.min(visibleCount, filteredWords.length) - 1;
        if (focusedIndex >= lastVisible && visibleCount < filteredWords.length) {
          setVisibleCount((prev) => prev + PAGE_SIZE);
        }
        setFocusedIndex((prev) =>
          prev < filteredWords.length - 1 ? prev + 1 : prev
        );
        break;
      }
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelectWord(filteredWords[focusedIndex]);
        } else if (filteredWords.length === 1) {
          handleSelectWord(filteredWords[0]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  };

  if (loading && words.length === 0) {
    return (
      <div className={className}>
        {label && (
          <Label className="mb-2 block">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading words...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {error && (
        <div className="mb-2 px-3 py-2 border border-yellow-500/50 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm">
          {error} - You can still enter words manually.
        </div>
      )}

      {/* Autocomplete Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          required={required}
          placeholder={placeholder}
          dir="rtl"
          aria-invalid={fieldError && fieldError.length > 0 ? true : undefined}
          className={cn("text-xl font-arabic", fieldError && fieldError.length > 0 && "border-destructive")}
        />

        {/* Autocomplete Dropdown */}
        {showDropdown && filteredWords.length > 0 && (
          <div
            ref={dropdownRef}
            onScroll={handleDropdownScroll}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {filteredWords.slice(0, visibleCount).map((word, index) => (
              <button
                key={word.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectWord(word);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-center justify-between transition-colors",
                  "hover:bg-accent",
                  index === focusedIndex && "bg-accent"
                )}
              >
                <div className="flex-1">
                  <div className="text-lg font-arabic">{word.arabic}</div>
                  {(word.transliteration || word.english) && (
                    <div className="text-xs text-muted-foreground">
                      {word.transliteration && `${word.transliteration}`}
                      {word.transliteration && word.english && " - "}
                      {word.english}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  {word.has_image && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      <Image className="h-3 w-3 mr-0.5" />
                      Image
                    </Badge>
                  )}
                  {word.has_audio && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      <Volume2 className="h-3 w-3 mr-0.5" />
                      Audio
                    </Badge>
                  )}
                </div>
              </button>
            ))}
            {visibleCount < filteredWords.length && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t text-center">
                Showing {visibleCount} of {filteredWords.length} — scroll for more…
              </div>
            )}
          </div>
        )}

        {/* Hint Text */}
        <p className="mt-1 text-xs text-muted-foreground">
          {inputValue.trim()
            ? filteredWords.length > 0
              ? `${filteredWords.length} word${filteredWords.length === 1 ? "" : "s"} found`
              : spellingPreview?.kind === "reuse"
                ? "Same spelling as an existing library word - see below"
                : spellingPreview?.kind === "invalid"
                  ? "Not a valid Arabic spelling - see below"
                  : "New word - will be added to library when saved"
            : `${words.length} words in library`}
        </p>

        {/* The server refused the word on the last save */}
        {fieldError && fieldError.length > 0 && (
          <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive" role="alert">
            <p className="font-medium">The server refused this word: it is not a valid Arabic spelling.</p>
            <ul className="mt-1 list-disc pl-5">
              {fieldError.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Show Translation Input */}
      {showTranslation && onTranslationChange && (
        <div className="mt-3">
          <Label className="mb-2 block">Word Meaning / Translation</Label>
          <Input
            type="text"
            value={translationValue}
            onChange={(e) => onTranslationChange(e.target.value)}
            placeholder="Lion"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            This will be converted to audio and played in the app
          </p>
        </div>
      )}

      {/* Selected Word Details */}
      {selectedWord && (
        <div className="mt-3 p-3 bg-muted/50 rounded-md border">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-2xl font-arabic mb-1">{selectedWord.arabic}</div>
              {selectedWord.transliteration && (
                <div className="text-sm text-muted-foreground">
                  {selectedWord.transliteration}
                </div>
              )}
              {selectedWord.english && (
                <div className="text-sm text-muted-foreground">
                  {selectedWord.english}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {selectedWord.has_image ? (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Image
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  No Image
                </Badge>
              )}
              {selectedWord.has_audio ? (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Audio
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  No Audio
                </Badge>
              )}
            </div>
          </div>

          {/* Letter Composition */}
          {selectedWord.letter_composition &&
            selectedWord.letter_composition.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs font-medium mb-1">Letter Composition:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedWord.letter_composition.map((comp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-background border rounded text-xs"
                    >
                      <span className="font-arabic text-base">{comp.character}</span>
                      <span className="text-muted-foreground">
                        {compositionLetterId(comp)} ({comp.form})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Usage Info */}
          <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Used in {selectedWord.usage_count} activities</span>
            {selectedWord.difficulty && (
              <span>Difficulty: {selectedWord.difficulty}</span>
            )}
          </div>
        </div>
      )}

      {/* Same spelling as an existing word: the save reuses it */}
      {!selectedWord && spellingPreview?.kind === "reuse" && (
        <div className="mt-3 p-3 bg-blue-500/10 rounded-md border border-blue-500/30 text-sm text-blue-600 dark:text-blue-400">
          <div>
            <strong className="font-arabic text-base">{value}</strong> has the same spelling as the library word{" "}
            <strong className="font-arabic text-base">{spellingPreview.word.arabic}</strong>
            {spellingPreview.word.english && ` (${spellingPreview.word.english})`}. Saving will use the existing word; no
            new word is added.
          </div>
          <button
            type="button"
            className="mt-1 text-xs font-medium underline underline-offset-2"
            onClick={() => handleSelectWord(spellingPreview.word)}
          >
            Use the existing word
          </button>
        </div>
      )}

      {/* Not a valid spelling: the library will not take it */}
      {!selectedWord && spellingPreview?.kind === "invalid" && !(fieldError && fieldError.length > 0) && (
        <div className="mt-3 p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
          <div>
            <strong className="font-arabic text-base">{value}</strong> is not a valid Arabic spelling, so it cannot be
            added to the word library:
          </div>
          <ul className="mt-1 list-disc pl-5">
            {spellingPreview.issues.map((issue, i) => (
              <li key={i}>{plainSpellingIssue(issue, spellingPreview.spelling)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* New Word Info */}
      {!selectedWord && value && !exactMatch && spellingPreview?.kind === "new" && (
        <div className="mt-3 p-3 bg-blue-500/10 rounded-md border border-blue-500/30">
          <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
            <svg
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <strong className="font-arabic text-base">{value}</strong> will be
              added to the word library when you save this activity.
              {spellingPreview.changed && (
                <>
                  {" "}It is stored as its normalised spelling{" "}
                  <strong className="font-arabic text-base">{spellingPreview.spelling}</strong>.
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
