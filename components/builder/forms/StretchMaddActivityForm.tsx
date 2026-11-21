"use client";

import * as React from "react";
import { FormField, Select, WordSelector } from "./shared";
import { V2OnlyNote } from "./shared/V2OnlyNote";
import type { BaseActivityFormProps } from "./types";
import type { StretchMaddConfig } from "@/lib/types/activity-configs";
import {
  describeMadd,
  effectiveCounts,
  MADD_COUNTS_OPTIONS,
} from "@/lib/stretchMadd/describeMadd";

const AUTO = "auto";

/**
 * Stretch the Madd: the author picks a word with one madd. The madd letter,
 * its kind and the default number of beats are read from the word, so there is
 * no madd type to choose; `counts` only overrides the default.
 */
export function StretchMaddActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<StretchMaddConfig>) {
  const wordText = config?.word?.text ?? "";
  const madd = describeMadd(wordText);
  const counts = effectiveCounts(madd, config?.counts);

  const handleWordChange = React.useCallback(
    (word: string, wordData?: { id?: string }) => {
      onChange({ ...config, word: { wordId: wordData?.id, text: word } });
    },
    [config, onChange],
  );

  const handleCountsChange = React.useCallback(
    (value: string) => {
      const next = { ...config } as StretchMaddConfig;
      if (value === AUTO) delete next.counts;
      else next.counts = Number(value);
      onChange(next);
    },
    [config, onChange],
  );

  return (
    <div className="space-y-4">
      <V2OnlyNote />

      <FormField
        label="Word"
        required
        hint="A fully vowelled word with exactly one madd: a short vowel followed by its long letter (fatha + alif, damma + waw, kasra + yaa). The child holds the madd while the scene stretches."
        errorPath="word.text"
      >
        <WordSelector
          value={wordText}
          onChange={handleWordChange}
          label=""
          required
          placeholder="Type to search or enter a word with a madd..."
        />
      </FormField>

      {madd.status !== "empty" && (
        <div
          className={
            madd.status === "one"
              ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
          }
        >
          {madd.status === "one" ? (
            <>
              Madd found on letter <strong>#{madd.position}</strong> (
              <span dir="rtl" lang="ar" className="text-base">
                {madd.letter}
              </span>
              ). Type: <strong>{madd.kindLabel}</strong>. It is held for{" "}
              <strong>{counts} counts</strong>.
            </>
          ) : madd.status === "none" ? (
            <>
              This word has <strong>no madd</strong>. Pick a word with a long
              vowel, such as قَالَ, نُور or فِيل.
            </>
          ) : (
            <>
              This word has <strong>{madd.count} madds</strong>. Exactly one is
              required, so the stretch is unambiguous.
            </>
          )}
        </div>
      )}

      {madd.status === "one" && (
        <FormField
          label="Counts"
          hint="How many beats the child holds the madd. Automatic uses the type above (natural 2, connected 4, required 6)."
          errorPath="counts"
        >
          <Select
            value={config?.counts === undefined ? AUTO : String(config.counts)}
            onChange={handleCountsChange}
            options={[
              { value: AUTO, label: `Automatic (${madd.defaultCounts})` },
              ...MADD_COUNTS_OPTIONS.map((n) => ({ value: String(n), label: String(n) })),
            ]}
          />
        </FormField>
      )}
    </div>
  );
}
