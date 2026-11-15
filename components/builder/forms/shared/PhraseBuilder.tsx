"use client";

/**
 * Builds a `phrase` content item (content model CM-S11; backend CM-B33, ADR
 * 0002 decision 2): reviewed words picked in reading order, reordered or
 * removed, and the "full sentence" flag. The reading text is built from the
 * word rows the way the server builds it and shown right to left. No Arabic
 * is typed or stored.
 *
 * `onChange` receives the item the save would send, or null while the draft
 * is not a valid phrase (too few or too many words). No activity type takes a
 * phrase yet (CM-B35 adds them), so no form uses this control today.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WordPicker } from "@/components/families/WordPicker";
import { listCuratedWords } from "@/lib/api/wordFamilies";
import type { PhraseRefWrite } from "@kalam/curriculum-schemas/server";
import {
  addWord,
  canAddWord,
  fromPhraseItem,
  maxWordsOf,
  moveWord,
  phraseProblems,
  phraseReadingText,
  phraseWordChoices,
  removeWordAt,
  setSentence,
  toPhraseItem,
  type PhraseDraft,
} from "@/lib/phrases/phraseItem";
import { FieldErrors } from "./SaveErrors";

interface PhraseBuilderProps {
  /** The stored phrase item (read tolerantly), or nothing for a new one. */
  value?: unknown;
  /** The item to save, or null while the draft is not a valid phrase. */
  onChange: (item: PhraseRefWrite | null, draft: PhraseDraft) => void;
  label?: string;
  /** The config path this item sits at; the server's save errors there show below it. */
  errorPath?: string;
}

export function PhraseBuilder({ value, onChange, label = "Phrase", errorPath }: PhraseBuilderProps) {
  const words = useQuery({ queryKey: ["curated-words"], queryFn: listCuratedWords, staleTime: 60 * 1000 });
  const [draft, setDraft] = React.useState<PhraseDraft>(() => fromPhraseItem(value));
  const byId = React.useMemo(() => new Map((words.data ?? []).map((w) => [w.id, w])), [words.data]);
  const choices = React.useMemo(() => phraseWordChoices(words.data ?? []), [words.data]);
  const wordById = React.useCallback((id: string) => byId.get(id), [byId]);

  const update = (next: PhraseDraft) => {
    setDraft(next);
    onChange(toPhraseItem(next), next);
  };

  const text = phraseReadingText(draft.wordIds, wordById);
  const problems = words.data ? phraseProblems(draft, wordById) : [];
  const max = maxWordsOf(draft.isSentence);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{label}</Label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={draft.isSentence} onCheckedChange={(on) => update(setSentence(draft, on))} />
          Full sentence
        </label>
      </div>

      {words.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading words…
        </p>
      ) : words.error ? (
        <p className="text-sm text-destructive">Could not load words: {(words.error as Error).message}</p>
      ) : (
        <>
          {draft.wordIds.length > 0 && (
            <ol className="flex flex-wrap gap-2" dir="rtl">
              {draft.wordIds.map((id, i) => (
                <li key={`${id}-${i}`} className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                    aria-label="Move earlier"
                    title="Move earlier"
                    disabled={i === 0}
                    onClick={() => update(moveWord(draft, i, -1))}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-arabic text-xl">{byId.get(id)?.arabic ?? id}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                    aria-label="Move later"
                    title="Move later"
                    disabled={i === draft.wordIds.length - 1}
                    onClick={() => update(moveWord(draft, i, 1))}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Remove word"
                    title="Remove word"
                    onClick={() => update(removeWordAt(draft, i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}

          {canAddWord(draft) ? (
            <WordPicker
              words={choices}
              onPick={(w) => update(addWord(draft, w.id))}
              placeholder="Add a reviewed word..."
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              A {draft.isSentence ? "sentence" : "phrase"} holds at most {max} words.
            </p>
          )}

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Reading text (built from the word rows)</p>
            <p className="font-arabic text-2xl" dir="rtl" lang="ar">
              {text || <span className="text-sm text-muted-foreground">No words yet</span>}
            </p>
          </div>

          {problems.length > 0 && (
            <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {errorPath !== undefined && <FieldErrors path={errorPath} />}
    </div>
  );
}
