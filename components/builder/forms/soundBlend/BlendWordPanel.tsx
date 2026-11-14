"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "../shared";
import type { BlendEnding } from "@/lib/soundBlend/config";
import { checkFullForm, plainIssue, type IssueLike, type WordPreview } from "@/lib/soundBlend/preview";
import { BlendFormColumn, IssueList } from "./BlendFormColumn";

interface BlendWordPanelProps {
  preview: WordPreview;
  ending: BlendEnding;
  /** The word as the author gave it (the library text). */
  sourceText: string;
  isPseudo: boolean;
  /** Issues from the server's last refused save (BLEND_INVALID), per form. */
  serverIssues?: Partial<Record<BlendEnding, IssueLike[]>>;
  /** Make the full form the activity's word (a library word of its own). */
  onUseFullForm: (fullText: string) => void;
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
  sourceText,
  isPseudo,
  serverIssues,
  onUseFullForm,
  onPseudoChange,
  onSplit,
  onMerge,
  onReset,
}: BlendWordPanelProps) {
  const [editing, setEditing] = React.useState<BlendEnding | null>(null);
  const [fullText, setFullText] = React.useState("");
  const fullIssues = checkFullForm(sourceText, fullText);

  const column = (form: BlendEnding, title: string, extra?: React.ReactNode) => {
    const p = preview[form];
    const fromServer = (serverIssues?.[form] ?? []).map((i) => plainIssue(i, p.split, p.units));
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
        {fromServer.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
            <p className="mb-1 text-xs font-medium text-destructive">The server refused this split on save:</p>
            <IssueList issues={fromServer} />
          </div>
        )}
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
          !preview.fullKnown ? (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  value={fullText}
                  onChange={(e) => setFullText(e.target.value)}
                  placeholder="كِتَابٌ"
                  dir="rtl"
                  className="font-arabic text-lg"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!fullText.trim() || fullIssues.length > 0}
                  onClick={() => {
                    onUseFullForm(fullText.trim());
                    setFullText("");
                  }}
                >
                  Use as the word
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {preview.sameText
                  ? "This word has no case ending or tanween. If its full form has one, type it: the full form becomes the activity's word (a new library word), and the pausal form is derived from it."
                  : "Type the full form, with its case ending or tanween."}
              </p>
              <IssueList issues={fullIssues} />
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
