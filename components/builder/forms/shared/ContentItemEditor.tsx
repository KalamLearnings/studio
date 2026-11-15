"use client";

/**
 * ContentItemEditor (content model CM-S6, CONTENT_ITEM_DESIGN.md): one
 * content item, as a kind toggle and the matching picker. A letter is a
 * letter reference (LetterSelector); a word comes from the word library
 * (WordSelector; the item keeps the word id, the text is a display hint); an
 * image comes from the asset library (the item keeps the asset id, the URL is
 * a display hint); an audio clip from the audio library; a numeral is a whole
 * number (D17). Switching kind clears the other payloads.
 *
 * Pure item logic lives in lib/activityConfig/contentItems.ts.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { EditorItem, EditorKind } from "@/lib/activityConfig/contentItems";
import { withKind } from "@/lib/activityConfig/contentItems";
import type { Word } from "@/lib/hooks/useWords";
import type { Asset } from "@/lib/types/assets";
import type { LetterReference, TopicContext } from "../types";
import { LetterSelector } from "./LetterSelector";
import { WordSelector } from "./WordSelector";
import { ImageLibraryModal } from "./ImageLibraryModal";
import { AudioPickerField } from "./AudioPickerField";

export const CONTENT_KIND_OPTIONS: { value: EditorKind; label: string; icon: string }[] = [
  { value: "letter", label: "Letter", icon: "ا" },
  { value: "word", label: "Word", icon: "📖" },
  { value: "image", label: "Image", icon: "🖼️" },
  { value: "audio", label: "Audio", icon: "🔊" },
  { value: "numeral", label: "Number", icon: "١٢" },
];

/** The kind toggle options for the allowed kinds, in the usual order. */
export function kindOptions(allowed: readonly EditorKind[]) {
  return CONTENT_KIND_OPTIONS.filter((o) => allowed.includes(o.value));
}

/** A word picked in the library: its id is the reference, its text a display hint. */
export function wordPayload(text: string, word?: Word): EditorItem["word"] {
  return word ? { wordId: word.id, text: word.arabic } : { text };
}

/** An image picked in the library: its registry id is the reference, its URL a display hint. */
export function imagePayload(url: string, asset?: Asset): EditorItem["image"] {
  return asset?.registryId ? { assetId: asset.registryId, url } : { url };
}

/** A numeral typed by the author: a whole number from 0, else undefined. */
export function parseNumeral(raw: string): number | undefined {
  const text = raw.trim();
  if (!/^\d{1,4}$/.test(text)) return undefined;
  return Number(text);
}

interface ContentItemEditorProps {
  value: EditorItem;
  onChange: (item: EditorItem) => void;
  /** Default: letter, word, image, audio. */
  allowedKinds?: readonly EditorKind[];
  /** Show the optional authoring label (match pairs: hints). */
  showLabel?: boolean;
  topic?: TopicContext | null;
  /** Letter picker options. */
  showHarakaSelector?: boolean;
  showMaddToggle?: boolean;
}

export function ContentItemEditor({
  value,
  onChange,
  allowedKinds = ["letter", "word", "image", "audio"],
  showLabel = false,
  topic,
  showHarakaSelector,
  showMaddToggle = false,
}: ContentItemEditorProps) {
  const [showImageLibrary, setShowImageLibrary] = React.useState(false);
  const item = value;

  return (
    <div className="p-3 bg-muted/50 rounded-lg border">
      <div className="flex gap-1 mb-3">
        {kindOptions(allowedKinds).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(withKind(item, opt.value))}
            className={cn(
              "flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors",
              item.kind === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-background border hover:bg-muted"
            )}
          >
            <span className="mr-1">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {item.kind === "letter" && (
        <LetterSelector
          value={(item.letter as LetterReference | undefined) ?? null}
          onChange={(ref) => {
            const r = Array.isArray(ref) ? ref[0] : ref;
            const next = { ...item };
            if (r) next.letter = r as EditorItem["letter"];
            else delete next.letter;
            onChange(next);
          }}
          topic={topic}
          showFormSelector
          showHarakaSelector={showHarakaSelector}
          showMaddToggle={showMaddToggle}
        />
      )}

      {item.kind === "word" && (
        <WordSelector
          value={item.word?.text ?? ""}
          onChange={(text, word) => onChange({ ...item, word: wordPayload(text, word) })}
          label=""
          placeholder="كلمة"
        />
      )}

      {item.kind === "numeral" && (
        <input
          type="text"
          inputMode="numeric"
          value={typeof item.numeral === "number" ? String(item.numeral) : ""}
          onChange={(e) => {
            const n = parseNumeral(e.target.value);
            const next = { ...item };
            if (n === undefined) delete next.numeral;
            else next.numeral = n;
            onChange(next);
          }}
          placeholder="0"
          className="w-full px-2 py-1 text-sm border rounded bg-background focus:ring-1 focus:ring-primary"
        />
      )}

      {item.kind === "image" && (
        <>
          {item.image?.url ? (
            <div className="relative inline-block">
              <img
                src={item.image.url}
                alt="Selected"
                className="max-w-full max-h-24 rounded-lg border"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowImageLibrary(true)}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...item };
                    delete next.image;
                    onChange(next);
                  }}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageLibrary(true)}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-muted-foreground transition-colors"
            >
              <div className="text-2xl mb-1">🖼️</div>
              <p className="text-xs text-muted-foreground">Select image</p>
            </button>
          )}

          <ImageLibraryModal
            isOpen={showImageLibrary}
            onClose={() => setShowImageLibrary(false)}
            currentImage={item.image?.url}
            onSelectImage={(url, asset) => {
              onChange({ ...item, image: imagePayload(url, asset) });
              setShowImageLibrary(false);
            }}
          />
        </>
      )}

      {item.kind === "audio" && (
        <AudioPickerField
          value={item.audio?.url}
          audioId={item.audio?.assetId}
          reportAssetId
          onChange={(url, id) => {
            const next = { ...item };
            if (url || id) next.audio = { ...(id ? { assetId: id } : {}), ...(url ? { url } : {}) };
            else delete next.audio;
            onChange(next);
          }}
        />
      )}

      {showLabel && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Optional label (for hints)"
            value={item.label || ""}
            onChange={(e) => {
              const next = { ...item };
              if (e.target.value) next.label = e.target.value;
              else delete next.label;
              onChange(next);
            }}
            className="w-full px-2 py-1 text-xs border rounded bg-background focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
    </div>
  );
}
