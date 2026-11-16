"use client";

/**
 * Names a new word (family) or a new meaning (concept) before it is created:
 * the English, and the id that never changes (proposed from the English).
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSlug, slugFromText } from "@/lib/words/family";

export interface NameResult {
  id: string;
  english: string;
}

export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  englishLabel,
  initialEnglish = "",
  taken,
  onSubmit,
  busy,
  submitLabel = "Create",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  englishLabel: string;
  initialEnglish?: string;
  /** Ids already used: refused before sending. */
  taken: (id: string) => boolean;
  onSubmit: (r: NameResult) => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const [english, setEnglish] = React.useState(initialEnglish);
  const [id, setId] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const fid = React.useId();
  React.useEffect(() => {
    if (open) {
      setEnglish(initialEnglish);
      setId("");
      setTouched(false);
    }
  }, [open, initialEnglish]);
  const effective = touched ? id : (slugFromText(english) ?? "");
  const problem = !effective
    ? null
    : !isSlug(effective)
      ? "Use lowercase letters and digits joined by single - or _."
      : taken(effective)
        ? "This id is taken. Pick another."
        : null;
  const valid = !!english.trim() && !!effective && !problem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !busy) onSubmit({ id: effective, english: english.trim() });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`${fid}-en`}>{englishLabel}</Label>
            <Input id={`${fid}-en`} autoFocus value={english} onChange={(e) => setEnglish(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fid}-id`}>Id (never changes)</Label>
            <Input
              id={`${fid}-id`}
              value={effective}
              onChange={(e) => {
                setId(e.target.value);
                setTouched(true);
              }}
              aria-invalid={!!problem}
              aria-describedby={problem ? `${fid}-err` : undefined}
            />
            {problem && (
              <p id={`${fid}-err`} className="text-xs text-destructive">
                {problem}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 motion-safe:animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
