"use client";

/**
 * Read and Match (CM-S12; backend CM-B35, ADR 0002): the child reads a
 * reviewed phrase or sentence and taps the one picture that matches it.
 * The phrase is built from reviewed words (`PhraseBuilder`, with the node's
 * live decodability report); the pictures come from the asset library, as in
 * the multiple choice form. Pure rules: lib/readingTypes/readAndMatch.ts.
 */

import * as React from "react";
import {
  Checkbox,
  ContentItemGrid,
  FieldErrors,
  FormField,
  FormProblems,
  PhraseBuilder,
  useReferenceHints,
  V2OnlyNote,
} from "./shared";
import type { BaseActivityFormProps } from "./types";
import type { EditorItem } from "@/lib/activityConfig/contentItems";
import { phraseValue, withHints, type Config } from "@/lib/readingTypes/common";
import {
  addOption,
  markCorrect,
  READ_AND_MATCH_MAX_OPTIONS,
  READ_AND_MATCH_MIN_OPTIONS,
  readAndMatchOptions,
  readAndMatchProblems,
} from "@/lib/readingTypes/readAndMatch";

const PICTURE: EditorItem["kind"][] = ["image"];

export function ReadAndMatchActivityForm({ config, onChange, topic, nodeId }: BaseActivityFormProps<Config>) {
  const hints = useReferenceHints();
  const options = readAndMatchOptions(config).map((o) => withHints(o, hints));
  const update = (patch: Config) => onChange({ ...config, ...patch });

  const changeOption = (index: number, item: EditorItem) => {
    const next = options.map((o, i) => (i === index ? item : o));
    const becameCorrect = item.isCorrect === true && options[index]?.isCorrect !== true;
    update({ options: becameCorrect ? markCorrect(next, index) : next });
  };

  return (
    <div className="space-y-6">
      <V2OnlyNote />

      <PhraseBuilder
        value={config?.sentence}
        onChange={(item, draft) => update({ sentence: phraseValue(item, draft) })}
        label="Phrase or sentence to read"
        errorPath="sentence"
        nodeId={nodeId}
      />

      <div className="space-y-2">
        <ContentItemGrid
          items={options}
          onChangeItem={changeOption}
          kind="image"
          onKindChange={() => undefined}
          allowedKinds={PICTURE}
          showKindToggle={false}
          title="Pictures (tick the one that matches)"
          showCorrectCheckbox
          columns={4}
          allowAddRemove
          onAdd={() => update({ options: addOption(options) })}
          onRemove={(index) => update({ options: options.filter((_, i) => i !== index) })}
          minItems={READ_AND_MATCH_MIN_OPTIONS}
          maxItems={READ_AND_MATCH_MAX_OPTIONS}
          topic={topic}
        />
        <FormProblems problems={readAndMatchProblems(options)} />
        <FieldErrors path="options" />
      </div>

      <FormField
        label="Read the sentence aloud first"
        hint="Off by default: the child reads first. When on, the app reads the whole text before the child answers, so the answer counts as listening, not reading. It needs a recording of the whole sentence, which is not recorded yet, so this stays off until it is."
        errorPath="playSentenceFirst"
      >
        <Checkbox
          checked={config?.playSentenceFirst === true}
          // Locked off until whole-sentence audio is recorded: a stored true can be
          // cleared, but it cannot be switched on (the server would count the
          // answer as listening while no audio plays).
          onChange={(on) => {
            if (!on) update({ playSentenceFirst: undefined });
          }}
          label="Play the whole sentence before the child answers"
        />
      </FormField>
    </div>
  );
}
