"use client";

/** "What the child sees": the read-only preview of an AI draft's config (CW-7, `lib/review/draftPreview`). */

import { cn } from "@/lib/utils";
import { draftPreview } from "@/lib/review/draftPreview";
import { Ar } from "../../parts";

const FORM_WORD = { isolated: "", initial: "initial", medial: "middle", final: "final" } as const;

export function DraftPreview({ type, config }: { type: string; config: Record<string, unknown> | null }) {
  const p = draftPreview(type, config);

  if (p.kind === "missing") return <p className="text-[12.5px] text-muted-foreground">{p.reason}</p>;

  if (p.kind === "grid") {
    return (
      <>
        <div dir="rtl" className="grid max-w-[420px] grid-cols-6 gap-1.5" aria-label="The grid, as drawn here">
          {p.cells.map((c, i) => (
            <span
              key={i}
              lang="ar"
              className={cn(
                "grid aspect-square place-items-center rounded-lg border bg-background font-naskh text-[26px] leading-none",
                c.target && "border-secondary/70 bg-secondary/15",
              )}
            >
              {c.glyph}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tap every {p.targets.map((t, i) => <Ar key={i} className="mx-0.5 text-base text-foreground">{t.glyph}</Ar>)}: {p.targetCount}{" "}
          {p.targetCount === 1 ? "target" : "targets"} among {p.total}
          {p.distractors.length > 0 ? (
            <>
              , distractors{" "}
              {p.distractors.map((d, i) => (
                <Ar key={i} className="mx-0.5 text-base text-foreground">
                  {d.glyph}
                </Ar>
              ))}
            </>
          ) : (
            ", no distractors"
          )}
          . The app shuffles the grid.
          {p.countsDefaulted && " The draft leaves the counts to the app, so this shows 4 of 12."}
          {p.theme && ` Theme: ${p.theme}.`}
        </p>
      </>
    );
  }

  const taps = p.units.filter((u) => u.target).length;
  return (
    <>
      <div dir="rtl" className="flex flex-wrap gap-1" aria-label="The word, letter by letter">
        {p.units.map((u, i) => (
          <span
            key={i}
            lang="ar"
            className={cn(
              "rounded-lg border px-3 py-1 font-naskh text-[40px] leading-[1.5]",
              u.target && "border-secondary/70 bg-secondary/15",
            )}
          >
            {u.text}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tap the {p.letter ? <Ar className="mx-0.5 text-base text-foreground">{p.letter.glyph}</Ar> : "letter"}
        {p.letter && FORM_WORD[p.letter.form] ? ` (${FORM_WORD[p.letter.form]} form)` : ""} in{" "}
        <Ar className="mx-0.5 text-base text-foreground">{p.word}</Ar>: {p.targetCount} {p.targetCount === 1 ? "tap" : "taps"}
        {p.byPosition ? ", at the marked positions." : ", every matching letter."}
        {taps === 0 && " No letter of the word matches; open it in the builder."}
        {p.meaning && ` Meaning: ${p.meaning}.`}
      </p>
    </>
  );
}
