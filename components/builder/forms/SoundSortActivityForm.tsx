"use client";

/**
 * Sound Sort (CM-S12; backend CM-B35, ADR 0002): the child hears each word,
 * picture or clip and drags it into the basket of its sound. A first-sound
 * sort has 2 or 3 baskets; a listening contrast (two sounds English does not
 * tell apart) has exactly 2, and a basket shows no letter or word. Pure rules:
 * lib/readingTypes/soundSort.ts.
 */

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Checkbox,
  ContentItemEditor,
  FieldErrors,
  FormField,
  FormProblems,
  LetterSelector,
  ModeToggle,
  Select,
  useReferenceHints,
  V2OnlyNote,
} from "./shared";
import type { BaseActivityFormProps, LetterReference } from "./types";
import { useLetters } from "@/lib/hooks/useLetters";
import { withHints, type Config } from "@/lib/readingTypes/common";
import {
  addBin,
  addItem,
  binLabelKinds,
  binsOf,
  CONTRAST_BINS,
  ITEM_KINDS,
  itemsOf,
  letterIdsOf,
  removeBin,
  SOUND_SORT_MAX_BINS,
  SOUND_SORT_MAX_ITEMS,
  SOUND_SORT_MIN_BINS,
  SOUND_SORT_MIN_ITEMS,
  sortByOf,
  soundSortConfig,
  soundSortProblems,
  withBinLetter,
  withSortBy,
  type SortBin,
  type SortBy,
  type SortItem,
} from "@/lib/readingTypes/soundSort";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "first_sound", label: "First sound" },
  { value: "contrast", label: "Listening contrast" },
];

export function SoundSortActivityForm({ config, onChange, topic }: BaseActivityFormProps<Config>) {
  const hints = useReferenceHints();
  const { letters, getLetter } = useLetters();
  const sortBy = sortByOf(config);
  const bins = binsOf(config);
  const items = itemsOf(config, bins).map((it) => withHints(it, hints) as SortItem);

  const letterIdByChar = React.useMemo(() => {
    const m = new Map(letters.map((l) => [l.letter, l.id]));
    return (ch: string) => m.get(ch);
  }, [letters]);
  const problems = soundSortProblems(sortBy, bins, items, {
    wordLetters: (wordId) => {
      const text = hints.wordText(wordId);
      return text && letters.length > 0 ? letterIdsOf(text, letterIdByChar) : null;
    },
    letterName: (id) => getLetter(id)?.letter ?? id,
  });

  const save = (nextBins: readonly SortBin[], nextItems: readonly SortItem[], patch: Config = {}) =>
    onChange(soundSortConfig({ ...config, sortBy, ...patch }, nextBins, nextItems));
  const setBin = (index: number, bin: SortBin) => save(bins.map((b, i) => (i === index ? bin : b)), items);
  const setItem = (index: number, item: SortItem) => save(bins, items.map((it, i) => (i === index ? item : it)));
  const maxBins = sortBy === "contrast" ? CONTRAST_BINS : SOUND_SORT_MAX_BINS;

  return (
    <div className="space-y-6">
      <V2OnlyNote />

      <div className="space-y-2">
        <ModeToggle
          label="Sort by"
          value={sortBy}
          options={SORT_OPTIONS}
          onChange={(next) => save(withSortBy(bins, next), items, { sortBy: next })}
        />
        <p className="text-xs text-muted-foreground">
          {sortBy === "contrast"
            ? "Two sounds English does not tell apart (such as ح and ه). Exactly 2 baskets; a basket plays a sound or shows a picture, never a letter or word."
            : "Each item goes to the basket of the sound it starts with. 2 or 3 baskets."}
        </p>
        <FieldErrors path="sortBy" />
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Baskets</h3>
          {bins.length < maxBins && (
            <Button type="button" variant="ghost" size="sm" onClick={() => save(addBin(bins, sortBy), items)}>
              <Plus className="mr-1 h-4 w-4" />
              Add basket
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {bins.map((bin, i) => (
            <div key={bin.id} className="relative space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Basket {i + 1}</span>
                {bins.length > SOUND_SORT_MIN_BINS && (
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Remove basket"
                    title="Remove basket (its items move to the first basket)"
                    onClick={() => {
                      const next = removeBin(bins, items, i);
                      save(next.bins, next.items);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <FormField label="Sound">
                <LetterSelector
                  value={bin.letterId ? ({ letterId: bin.letterId, form: "isolated" } as LetterReference) : null}
                  onChange={(ref) => {
                    const r = Array.isArray(ref) ? ref[0] : ref;
                    setBin(i, withBinLetter(bin, r?.letterId ?? "", sortBy));
                  }}
                  topic={topic}
                  showFormSelector={false}
                  showHarakaSelector={false}
                />
              </FormField>
              <FormField
                label="What the basket shows"
                hint={sortBy === "contrast" ? "A sound clip or a picture." : undefined}
              >
                <ContentItemEditor
                  value={withHints(bin.label, hints)}
                  onChange={(label) => setBin(i, { ...bin, label })}
                  allowedKinds={binLabelKinds(sortBy)}
                  topic={topic}
                  showHarakaSelector={false}
                />
              </FormField>
            </div>
          ))}
        </div>
        <FieldErrors path="bins" />
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Items ({SOUND_SORT_MIN_ITEMS} to {SOUND_SORT_MAX_ITEMS})
          </h3>
          {items.length < SOUND_SORT_MAX_ITEMS && (
            <Button type="button" variant="ghost" size="sm" onClick={() => save(bins, addItem(items, bins))}>
              <Plus className="mr-1 h-4 w-4" />
              Add item
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Items are heard, not read: a library word plays its recording and shows its picture, never its text.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={item.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                {items.length > SOUND_SORT_MIN_ITEMS && (
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Remove item"
                    title="Remove item"
                    onClick={() => save(bins, items.filter((_, n) => n !== i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <ContentItemEditor
                value={item}
                onChange={(next) => setItem(i, { ...next, id: item.id, binId: item.binId })}
                allowedKinds={ITEM_KINDS}
                topic={topic}
              />
              <FormField label="Basket">
                <Select
                  value={item.binId}
                  onChange={(binId) => setItem(i, { ...item, binId })}
                  options={bins.map((b, n) => ({
                    value: b.id,
                    label: `Basket ${n + 1}${b.letterId ? ` (${getLetter(b.letterId)?.letter ?? b.letterId})` : ""}`,
                  }))}
                  placeholder="Pick a basket"
                />
              </FormField>
            </div>
          ))}
        </div>
        <FieldErrors path="items" />
      </div>

      <FormField label="Item sounds" errorPath="playItemAudio">
        <Checkbox
          checked={config?.playItemAudio !== false}
          onChange={(on) => onChange({ ...config, playItemAudio: on })}
          label="Play each item's sound"
        />
      </FormField>

      <FormProblems problems={problems} />
    </div>
  );
}
