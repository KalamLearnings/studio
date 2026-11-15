"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import type { CuratedWord } from "@/lib/types/wordFamilies";

/** A searchable list of spellings; the caller decides which are offered. */
export function WordPicker({
  words,
  onPick,
  placeholder = "Search spellings in Arabic or English...",
  limit = 8,
}: {
  words: readonly CuratedWord[];
  onPick: (word: CuratedWord) => void;
  placeholder?: string;
  limit?: number;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? words.filter((w) => w.arabic.includes(query.trim()) || (w.english ?? "").toLowerCase().includes(q)).slice(0, limit)
    : [];
  return (
    <div className="space-y-2">
      <Input placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length > 0 && (
        <ul className="divide-y rounded-md border">
          {shown.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  onPick(w);
                  setQuery("");
                }}
              >
                <span className="font-arabic text-xl" dir="rtl">{w.arabic}</span>
                <span className="text-sm text-muted-foreground">{w.english ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
