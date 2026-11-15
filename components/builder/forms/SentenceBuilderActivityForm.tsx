"use client";

/**
 * Sentence Builder (CM-S12; backend CM-B35, ADR 0002): the child puts the
 * word tiles of a reviewed phrase or sentence in order, right to left. The
 * tiles are the sentence's own words (its word order is the answer) and up to
 * three extra library words that fit no slot; an optional picture is the cue.
 * Pure rules: lib/readingTypes/sentenceBuilder.ts.
 */

import * as React from "react";
import { X } from "lucide-react";
import {
  Checkbox,
  ContentItemEditor,
  FormField,
  FormProblems,
  PhraseBuilder,
  useCuratedWords,
  useReferenceHints,
  V2OnlyNote,
} from "./shared";
import { WordPicker } from "@/components/families/WordPicker";
import type { BaseActivityFormProps } from "./types";
import type { EditorItem } from "@/lib/activityConfig/contentItems";
import { phraseValue, sentenceDraft, withHints, type Config } from "@/lib/readingTypes/common";
import {
  distractorChoices,
  distractorWordsOf,
  promptImageOf,
  SENTENCE_BUILDER_MAX_DISTRACTORS,
  sentenceBuilderProblems,
} from "@/lib/readingTypes/sentenceBuilder";

const PICTURE: EditorItem["kind"][] = ["image"];

export function SentenceBuilderActivityForm({ config, onChange, topic, nodeId }: BaseActivityFormProps<Config>) {
  const words = useCuratedWords();
  const hints = useReferenceHints();
  const update = (patch: Config) => onChange({ ...config, ...patch });

  const sentenceIds = sentenceDraft(config).wordIds;
  const distractors = distractorWordsOf(config).map((d) => withHints(d, hints));
  const prompt = promptImageOf(config);
  const choices = distractorChoices(words.data ?? [], sentenceIds, distractors);
  const problems = sentenceBuilderProblems(sentenceIds, distractors, prompt, hints.wordById);

  const setDistractors = (next: EditorItem[]) => update({ distractorWords: next.length > 0 ? next : undefined });

  return (
    <div className="space-y-6">
      <V2OnlyNote />

      <PhraseBuilder
        value={config?.sentence}
        onChange={(item, draft) => update({ sentence: phraseValue(item, draft) })}
        label="Phrase or sentence to build (its word order is the answer)"
        errorPath="sentence"
        nodeId={nodeId}
      />

      <FormField
        label="Extra word tiles"
        hint={`Up to ${SENTENCE_BUILDER_MAX_DISTRACTORS} reviewed library words that fit no slot. A word of the sentence cannot be an extra tile.`}
        errorPath="distractorWords"
      >
        {distractors.length > 0 && (
          <ul className="flex flex-wrap gap-2" dir="rtl">
            {distractors.map((d, i) => (
              <li key={`${d.word?.wordId ?? i}-${i}`} className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                <span className="font-arabic text-xl">{d.word?.text ?? d.word?.wordId ?? "?"}</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                  aria-label="Remove extra word"
                  title="Remove extra word"
                  onClick={() => setDistractors(distractors.filter((_, n) => n !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {distractors.length < SENTENCE_BUILDER_MAX_DISTRACTORS ? (
          <WordPicker
            words={choices}
            onPick={(w) => setDistractors([...distractors, { kind: "word", word: { wordId: w.id, text: w.arabic } }])}
            placeholder="Add a reviewed word..."
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            At most {SENTENCE_BUILDER_MAX_DISTRACTORS} extra tiles.
          </p>
        )}
      </FormField>

      <FormField label="Prompt picture (optional)" hint="A picture shown as the cue." errorPath="promptImage">
        <ContentItemEditor
          value={prompt ? withHints(prompt, hints) : { kind: "image" }}
          onChange={(item) => update({ promptImage: item.image ? item : undefined })}
          allowedKinds={PICTURE}
          topic={topic}
        />
      </FormField>

      <FormField
        label="Read the sentence aloud first"
        hint="Off by default: the child builds the sentence without hearing it first. When on, the app reads the whole text before the child answers, so the answer counts as listening, not reading. It needs a recording of the whole sentence, which is not recorded yet; leave it off for now."
        errorPath="playSentenceFirst"
      >
        <Checkbox
          checked={config?.playSentenceFirst === true}
          onChange={(on) => update({ playSentenceFirst: on || undefined })}
          label="Play the whole sentence before the child builds it"
        />
      </FormField>

      <FormProblems problems={problems} />
    </div>
  );
}
