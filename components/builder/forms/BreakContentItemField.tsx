"use client";

import * as React from "react";
import { FormField, LetterSelector, WordSelector, ImageLibraryModal, AudioPickerField, OptionsGrid } from "./shared";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import type { BreakContentItem, BreakContentKind, LetterReference } from "./types";

export type { BreakContentItem };

const KIND_OPTIONS = [
  { value: "letter", label: "Letter", icon: "ا" },
  { value: "word", label: "Word", icon: "📖" },
  { value: "image", label: "Image", icon: "🖼️" },
  { value: "audio", label: "Sound", icon: "🔊" },
];

export function newBreakContentItem(kind: BreakContentKind = "letter"): BreakContentItem {
  return { id: `item_${Math.random().toString(36).slice(2, 8)}`, kind };
}

interface BreakContentItemFieldProps {
  label: string;
  item: BreakContentItem;
  onChange: (item: BreakContentItem) => void;
}

export function BreakContentItemField({ label, item, onChange }: BreakContentItemFieldProps) {
  const { getLetter } = useLetters();
  const [imageOpen, setImageOpen] = React.useState(false);

  const setKind = (kind: BreakContentKind) => {
    onChange({ id: item.id, kind });
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <FormField label={label} required>
        <OptionsGrid
          value={item.kind}
          onChange={(value) => setKind(value as BreakContentKind)}
          options={KIND_OPTIONS}
          columns={4}
          size="md"
        />
      </FormField>

      {item.kind === "letter" && (
        <LetterSelector
          value={
            item.letter
              ? {
                  letterId: item.letter.letterId,
                  form: item.letter.form,
                  haraka: item.letter.haraka as LetterReference["haraka"],
                }
              : null
          }
          showFormSelector
          showHarakaSelector
          onChange={(value) => {
            const ref = Array.isArray(value) ? value[0] : value;
            if (!ref || Array.isArray(ref)) {
              onChange({ id: item.id, kind: "letter" });
              return;
            }
            const display = getLetterDisplayChar(ref, getLetter);
            onChange({
              id: item.id,
              kind: "letter",
              letter: {
                letterId: ref.letterId,
                form: ref.form,
                haraka: ref.haraka,
                display: display || undefined,
              },
            });
          }}
        />
      )}

      {item.kind === "word" && (
        <WordSelector
          value={item.word?.text ?? ""}
          label=""
          onChange={(text, wordData) =>
            onChange({
              id: item.id,
              kind: "word",
              word: { wordId: wordData?.id, text },
            })
          }
        />
      )}

      {item.kind === "image" && (
        <div>
          {item.image?.url ? (
            <button type="button" onClick={() => setImageOpen(true)}>
              <img src={item.image.url} alt="" className="h-16 w-16 rounded-md object-contain" />
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => setImageOpen(true)}
            >
              Choose image
            </button>
          )}
          <ImageLibraryModal
            isOpen={imageOpen}
            onClose={() => setImageOpen(false)}
            currentImage={item.image?.url}
            onSelectImage={(url) => {
              onChange({ id: item.id, kind: "image", image: { url } });
              setImageOpen(false);
            }}
          />
        </div>
      )}

      {item.kind === "audio" && (
        <AudioPickerField
          label="Sound"
          value={item.audio?.url}
          audioId={item.audio?.assetId}
          onChange={(url, audioId) =>
            onChange({
              id: item.id,
              kind: "audio",
              audio: url ? { url, assetId: audioId } : undefined,
            })
          }
        />
      )}
    </div>
  );
}
