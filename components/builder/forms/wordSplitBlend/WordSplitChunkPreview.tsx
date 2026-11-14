"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PreviewUnit } from "@/lib/blendWord/preview";
import type { WordSplitChunk } from "@/lib/wordSplitBlend/config";
import { CHUNK_AUDIO_NOTE, CHUNKS_NOTE } from "@/lib/wordSplitBlend/chunks";
import { kindBarClass } from "../blendWord/BlendFormColumn";

interface WordSplitChunkPreviewProps {
  /** The syllables of the activity's form, from the shared splitter. */
  units: PreviewUnit[];
  /** The form's name, e.g. "Pausal". */
  formLabel: string;
  /** Plain-words notes where the chunks differ from the syllables. */
  notes: string[];
  /** The word is too short in this form; the server will refuse it. */
  tooShort: string | null;
  /** The chunks as last saved (read-only), with v1's per-chunk audio. */
  savedChunks: WordSplitChunk[];
}

/**
 * The read-only chunk preview of a word_split_blend v2 row. The server builds
 * the chunks on save; this shows the syllables they come from, the notes
 * where they differ, and the saved chunks with their audio.
 */
export function WordSplitChunkPreview({ units, formLabel, notes, tooShort, savedChunks }: WordSplitChunkPreviewProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{CHUNKS_NOTE}</p>

      {units.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Syllables of the {formLabel.toLowerCase()} form</p>
          <div className="flex flex-wrap justify-start gap-1" dir="rtl">
            {units.map((unit, i) => (
              <div
                key={`${unit.id}-${i}`}
                className="flex min-w-[56px] flex-col items-center gap-1 rounded-md border bg-muted/40 p-2"
              >
                <span className="font-arabic text-2xl">{unit.text}</span>
                <div className={cn("h-1.5 w-full rounded-full", kindBarClass(unit))} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Type or pick a word to see its syllables.</p>
      )}

      {tooShort && <p className="text-sm text-destructive">{tooShort}</p>}
      {notes.length > 0 && (
        <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
          {notes.map((n) => (
            <li key={n}>Note: {n}</li>
          ))}
        </ul>
      )}

      {savedChunks.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Chunks as last saved (read-only)</p>
          <ol className="space-y-1">
            {savedChunks.map((chunk, i) => (
              <li key={i} className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-1.5">
                <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                <span className="font-arabic text-xl" dir="rtl">
                  {chunk.text || "-"}
                </span>
                {chunk.audio_url ? (
                  <audio controls preload="none" src={chunk.audio_url} className="ml-auto h-8" />
                ) : (
                  <span className="ml-auto text-xs text-muted-foreground">No chunk audio</span>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">{CHUNK_AUDIO_NOTE}</p>
        </div>
      )}
    </div>
  );
}
