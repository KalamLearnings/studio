"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { RULE_IDS } from "@kalam/curriculum-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LetterFormHarakaPicker } from "@/components/builder/letter-picker";
import type { LetterReference } from "@/components/builder/forms/types";
import {
  ROLE_LABELS,
  addKeys,
  describeUnitKey,
  ruleText,
  ruleUnitKey,
  unitKeyProblem,
  unitKeysOfLetter,
  type LetterLookup,
  type TargetRole,
} from "@/lib/teachingTargets/units";

interface TargetListEditorProps {
  role: TargetRole;
  keys: string[];
  onChange: (keys: string[]) => void;
  letterLookup?: LetterLookup;
  /** Save errors for this role's keys, by position in `keys`. */
  issues?: Map<number, string[]>;
  disabled?: boolean;
}

/**
 * One role's declared targets: unit-key chips, and three ways to add one (the
 * shared letter picker, the shared rule vocabulary, or a typed unit key).
 * Controlled: the parent owns the list and saves it.
 */
export function TargetListEditor({
  role,
  keys,
  onChange,
  letterLookup,
  issues,
  disabled,
}: TargetListEditorProps) {
  const [letterOpen, setLetterOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<LetterReference[]>([]);
  const [typed, setTyped] = React.useState("");
  const [typedError, setTypedError] = React.useState<string | null>(null);
  const meta = ROLE_LABELS[role];

  const addTyped = () => {
    const key = typed.trim();
    if (!key) return;
    const problem = unitKeyProblem(key);
    if (problem) {
      setTypedError(problem);
      return;
    }
    onChange(addKeys(keys, [key]));
    setTyped("");
    setTypedError(null);
  };

  const confirmLetters = () => {
    onChange(addKeys(keys, draft.flatMap((ref) => unitKeysOfLetter(ref))));
    setDraft([]);
    setLetterOpen(false);
  };

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-sm font-medium">{meta.label}</h4>
        <p className="text-xs text-muted-foreground">{meta.hint}</p>
      </div>

      {keys.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">None declared</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {keys.map((key, index) => {
            const problems = issues?.get(index);
            return (
              <li key={key} className="flex flex-col">
                <span
                  className={
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs " +
                    (problems ? "border-destructive text-destructive" : "")
                  }
                  title={key}
                >
                  {describeUnitKey(key, letterLookup)}
                  {!disabled && (
                    <button
                      type="button"
                      aria-label={`Remove ${key}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => onChange(keys.filter((k) => k !== key))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
                {problems?.map((p) => (
                  <span key={p} className="mt-0.5 text-xs text-destructive">
                    {p}
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-start gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setLetterOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Letter
          </Button>
          <Select
            value=""
            onValueChange={(ruleId) => onChange(addKeys(keys, [ruleUnitKey(ruleId)]))}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Add rule" />
            </SelectTrigger>
            <SelectContent>
              {RULE_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {ruleText(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-col">
            <div className="flex gap-1">
              <Input
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setTypedError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTyped();
                  }
                }}
                placeholder="Unit key, e.g. haraka:fatha"
                className="h-9 w-52"
              />
              <Button type="button" variant="ghost" size="sm" onClick={addTyped}>
                Add
              </Button>
            </div>
            {typedError && <span className="mt-0.5 text-xs text-destructive">{typedError}</span>}
          </div>
        </div>
      )}

      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add letters to {meta.label.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            A letter alone adds the letter. A form adds that form. A vowel adds the
            letter&apos;s sound with that vowel.
          </p>
          <div className="max-h-[60vh] overflow-y-auto">
            <LetterFormHarakaPicker mode="multi" multiForm value={draft} onChange={setDraft} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLetterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLetters} disabled={draft.length === 0}>
              Add {draft.length > 0 ? draft.length : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
