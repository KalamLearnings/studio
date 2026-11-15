"use client";

/**
 * ContentItemGrid (content model CM-S6): an answer set of content items (MCQ
 * options, cards) as a grid of squares, in the look of the old answer grid.
 * A kind toggle above the grid sets what the squares hold (v1 shows one kind
 * per set); each square opens the matching picker: the letter picker, the
 * word library (the word id is kept), the asset library (the asset id is
 * kept), or an inline number (D17).
 */

import * as React from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import type { EditorItem, EditorKind } from "@/lib/activityConfig/contentItems";
import { emptied, isFilled, withKind } from "@/lib/activityConfig/contentItems";
import type { LetterReference, TopicContext } from "../types";
import { ModeToggle } from "./ModeToggle";
import { LetterSelector } from "./LetterSelector";
import { WordSelector } from "./WordSelector";
import { ImageLibraryModal } from "./ImageLibraryModal";
import { imagePayload, kindOptions, parseNumeral, wordPayload } from "./ContentItemEditor";

interface ContentItemGridProps {
  items: EditorItem[];
  onChangeItem: (index: number, item: EditorItem) => void;
  /** The kind the squares hold; an empty square takes it. */
  kind: EditorKind;
  onKindChange: (kind: EditorKind) => void;
  allowedKinds: readonly EditorKind[];
  kindLabel?: string;
  /** False when the form draws its own kind buttons. */
  showKindToggle?: boolean;
  title?: string;
  showCorrectCheckbox?: boolean;
  columns?: 2 | 3 | 4;
  allowAddRemove?: boolean;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  minItems?: number;
  maxItems?: number;
  topic?: TopicContext | null;
}

const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;

const PLACEHOLDER: Record<EditorKind, string> = {
  letter: "أ",
  word: "كلمة",
  numeral: "١٢",
  image: "📸",
  audio: "🔊",
};

export function ContentItemGrid({
  items,
  onChangeItem,
  kind,
  onKindChange,
  allowedKinds,
  kindLabel = "Answer Type",
  showKindToggle = true,
  title = "Options",
  showCorrectCheckbox = true,
  columns = 4,
  allowAddRemove = false,
  onAdd,
  onRemove,
  minItems = 1,
  maxItems = 4,
  topic,
}: ContentItemGridProps) {
  const { getLetter } = useLetters();
  const [picking, setPicking] = React.useState<{ index: number; kind: EditorKind } | null>(null);
  const [editingNumeral, setEditingNumeral] = React.useState<number | null>(null);

  /** The item as its square shows it: an empty square takes the grid's kind. */
  const shown = (item: EditorItem): EditorItem =>
    isFilled(item) || item.kind === kind ? item : withKind(item, kind);

  const open = (index: number) => {
    const item = shown(items[index]);
    if (item.kind === "numeral") setEditingNumeral(index);
    else setPicking({ index, kind: item.kind });
  };

  const update = (index: number, patch: Partial<EditorItem>) => {
    onChangeItem(index, { ...shown(items[index]), ...patch });
  };

  const clear = (index: number) => onChangeItem(index, emptied(shown(items[index])));

  const canAdd = allowAddRemove && items.length < maxItems;
  const canRemove = allowAddRemove && items.length > minItems;
  const pickingItem = picking ? shown(items[picking.index]) : null;

  return (
    <>
      {showKindToggle && (
        <ModeToggle
          label={kindLabel}
          value={kind}
          options={kindOptions(allowedKinds)}
          onChange={onKindChange}
          borderTop
        />
      )}

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          {canAdd && (
            <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Add Option
            </Button>
          )}
        </div>

        <div className={cn("grid gap-3 max-w-2xl", GRID_COLS[columns])}>
          {items.map((raw, index) => {
            const item = shown(raw);
            return (
              <div key={item.id ?? index} className="relative">
                {showCorrectCheckbox && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Checkbox
                      checked={item.isCorrect || false}
                      onCheckedChange={(checked) => update(index, { isCorrect: !!checked })}
                      className="h-3.5 w-3.5"
                    />
                    <label className="text-xs text-muted-foreground">
                      {index + 1}
                      {item.isCorrect && <span className="ml-1 text-green-600">✓</span>}
                    </label>
                  </div>
                )}

                <div
                  className={cn(
                    "aspect-square border-2 rounded-lg overflow-hidden",
                    "bg-muted/30 flex items-center justify-center",
                    "cursor-pointer hover:border-primary/50 transition-colors",
                    item.isCorrect ? "border-green-400" : "border-border"
                  )}
                  onClick={() => open(index)}
                >
                  {editingNumeral === index ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      defaultValue={typeof item.numeral === "number" ? String(item.numeral) : ""}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const n = parseNumeral(e.target.value);
                        const next = { ...item };
                        if (n === undefined) delete next.numeral;
                        else next.numeral = n;
                        onChangeItem(index, next);
                        setEditingNumeral(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingNumeral(null);
                      }}
                      className="text-center text-2xl font-semibold bg-transparent outline-none w-full"
                      placeholder="0"
                    />
                  ) : isFilled(item) ? (
                    <div className="relative w-full h-full group flex items-center justify-center">
                      <SquareContent item={item} letterGlyph={getLetterDisplayChar(item.letter, getLetter)} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clear(index);
                        }}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs text-center px-2">
                      <div className={cn("text-2xl mb-1", item.kind !== "image" && "font-arabic")}>
                        {PLACEHOLDER[item.kind]}
                      </div>
                      {item.kind === "numeral" ? "Click to type" : "Click to select"}
                    </div>
                  )}
                </div>

                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove?.(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors"
                    title="Remove option"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {picking?.kind === "letter" && pickingItem && (
        <Dialog open onOpenChange={() => setPicking(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select Letter</DialogTitle>
            </DialogHeader>
            <LetterSelector
              value={(pickingItem.letter as LetterReference | undefined) ?? null}
              onChange={(selected) => {
                const ref = Array.isArray(selected) ? selected[0] : selected;
                if (ref) update(picking.index, { letter: ref as EditorItem["letter"] });
                setPicking(null);
              }}
              topic={topic}
              showFormSelector
              showHarakaSelector
            />
          </DialogContent>
        </Dialog>
      )}

      {picking?.kind === "word" && pickingItem && (
        <Dialog open onOpenChange={() => setPicking(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Select Word</DialogTitle>
            </DialogHeader>
            <WordSelector
              value={pickingItem.word?.text ?? ""}
              onChange={(text, word) => {
                update(picking.index, { word: wordPayload(text, word) });
                // a library pick closes the picker; typing keeps it open
                if (word) setPicking(null);
              }}
              placeholder="Type to search word library..."
            />
          </DialogContent>
        </Dialog>
      )}

      <ImageLibraryModal
        isOpen={picking?.kind === "image"}
        onClose={() => setPicking(null)}
        currentImage={pickingItem?.image?.url}
        onSelectImage={(url, asset) => {
          if (picking) update(picking.index, { image: imagePayload(url, asset) });
          setPicking(null);
        }}
      />
    </>
  );
}

function SquareContent({ item, letterGlyph }: { item: EditorItem; letterGlyph: string }) {
  switch (item.kind) {
    case "letter":
      return (
        <div className="text-4xl font-arabic font-semibold" dir="rtl">
          {letterGlyph || "?"}
        </div>
      );
    case "word":
      return (
        <div className="font-semibold p-1 text-center text-2xl font-arabic" dir="rtl">
          {item.word?.text || "?"}
        </div>
      );
    case "numeral":
      return <div className="font-semibold text-center text-3xl">{item.numeral}</div>;
    case "image":
      return item.image?.url ? (
        <img src={item.image.url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="text-xs text-muted-foreground">Image</div>
      );
    case "audio":
      return <div className="text-2xl">🔊</div>;
  }
}
