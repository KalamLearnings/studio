"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { convertWarning } from "@/lib/wordSplitBlend/chunks";

interface UseWordModelActionProps {
  /** The row has chunks the author made by hand. */
  hasHandMadeChunks: boolean;
  onConvert: () => void;
}

/** "Use the word model" on a legacy row, with a warning before it converts. */
export function UseWordModelAction({ hasHandMadeChunks, onConvert }: UseWordModelActionProps) {
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3">
        <p className="text-sm text-muted-foreground">
          This activity uses hand-made chunks. On the word model, the chunks come from the word&apos;s syllables.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Use the word model
        </Button>
      </div>
    );
  }

  return (
    <div role="alertdialog" className="space-y-2 rounded-lg border border-amber-500/60 bg-amber-50 p-3 dark:bg-amber-950/30">
      <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {convertWarning(hasHandMadeChunks)}
        </span>
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setConfirming(false);
            onConvert();
          }}
        >
          Convert
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
