"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "../shared";
import type { BlendEnding } from "@/lib/soundBlend/config";
import type { WordPreview } from "@/lib/soundBlend/preview";
import { BlendFormColumn, IssueList } from "./BlendFormColumn";

interface BlendWordPanelProps {
  preview: WordPreview;
  ending: BlendEnding;
  fullText: string;
  isPseudo: boolean;
  onFullTextChange: (text: string) => void;
  onPseudoChange: (isPseudo: boolean) => void;
  onSplit: (form: BlendEnding, unitIndex: number, at: number) => void;
  onMerge: (form: BlendEnding, unitIndex: number) => void;
  onReset: (form: BlendEnding) => void;
}

/**
 * The word's two forms side by side (pausal, full), from the shared splitter,
 * with the split override and the pseudo-word flag. Both are saved on the word,
 * so every activity that uses it sees them.
 */
export function BlendWordPanel({
  preview,
  ending,
  fullText,
  isPseudo,
  onFullTextChange,
  onPseudoChange,
  onSplit,
  onMerge,
  onReset,
}: BlendWordPanelProps) {
  const [editing, setEditing] = React.useState<BlendEnding | null>(null);
  const askFull = !preview.fullKnown || fullText !== "";

  const column = (form: BlendEnding, title: string, extra?: React.ReactNode) => {
    const p = preview[form];
    return (
      <BlendFormColumn
        title={title}
        preview={p}
        active={ending === form}
        editing={editing === form}
        canEdit={p.split.ok}
        onToggleEdit={() => setEditing(editing === form ? null : form)}
        onSplit={(i, at) => onSplit(form, i, at)}
        onMerge={(i) => onMerge(form, i)}
        onReset={() => onReset(form)}
      >
        {extra}
      </BlendFormColumn>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {column("pausal", "Pausal form")}
        {column(
          "full",
          "Full form",
          askFull ? (
            <div className="space-y-1">
              <Input
                value={fullText}
                onChange={(e) => onFullTextChange(e.target.value)}
                placeholder="كِتَابٌ"
                dir="rtl"
                className="font-arabic text-lg"
              />
              <p className="text-xs text-muted-foreground">
                {preview.sameText
                  ? "The word has no case ending or tanween here. If its full form has one, type it."
                  : "The full form of this word, with its case ending or tanween."}
              </p>
              <IssueList issues={preview.fullTextIssues} />
            </div>
          ) : null
        )}
      </div>

      <Checkbox
        checked={isPseudo}
        onChange={onPseudoChange}
        label="Practice word (not a real word, e.g. شِطِرَ). Kept out of the word games and translation."
      />
    </div>
  );
}
