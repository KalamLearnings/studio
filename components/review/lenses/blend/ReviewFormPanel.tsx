"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ENDING_LABELS } from "@/lib/blendWord/config";
import {
  harakatSourceLabel,
  overrideDiff,
  qaFlagView,
  reviewFormPreview,
  splitReviewLine,
  type BlendReviewForm,
  type SplitReviewBody,
} from "@/lib/blendWord/review";
import type { BlendReviewTake, TakeRequest, TakeReviewBody } from "@/lib/blendWord/takes";
import { BlendFormColumn } from "@/components/builder/forms/blendWord/BlendFormColumn";
import { FormAudioPanel } from "@/components/builder/forms/blendWord/audio/FormAudioPanel";
import type { TakeRowReviewProps } from "@/components/builder/forms/blendWord/audio/TakeRow";
import { SplitReviewControls, type SplitReviewHandle } from "./SplitReviewControls";

type Result = { ok: boolean; message?: string; lines?: string[] };

interface ReviewFormPanelProps {
  form: BlendReviewForm;
  generationOff: string | null;
  onReviewSplit: (body: SplitReviewBody) => Promise<Result>;
  onGenerate: (regenerate: boolean, settings: TakeRequest | null) => Promise<Result>;
  onReviewTake: (takeId: string, body: TakeReviewBody) => Promise<Result>;
  onSaveMarks: (takeId: string, marks: number[]) => Promise<Result>;
  /** The Review pane (CW-6): its keys drive the split review, and the split it focuses is outlined. */
  split?: { handleRef: React.Ref<SplitReviewHandle>; focused: boolean };
  /** The Review pane's extras for each take row. */
  takeRowProps?: (take: BlendReviewTake) => TakeRowReviewProps | undefined;
}

const noop = () => {};

/** One form of a word in the queue: the split, its override diff and flags, the split review, and the takes. */
export function ReviewFormPanel({
  form,
  generationOff,
  onReviewSplit,
  onGenerate,
  onReviewTake,
  onSaveMarks,
  split,
  takeRowProps,
}: ReviewFormPanelProps) {
  const preview = React.useMemo(() => reviewFormPreview(form), [form]);
  const diff = React.useMemo(() => overrideDiff(form), [form]);
  const flags = form.qaFlags ?? [];
  const splitRef = React.useRef<HTMLDivElement>(null);
  const splitFocused = !!split?.focused;
  React.useEffect(() => {
    if (splitFocused) splitRef.current?.scrollIntoView({ block: "nearest" });
  }, [splitFocused]);

  return (
    <div className="space-y-3">
      <BlendFormColumn
        title={`${ENDING_LABELS[form.form].label} form`}
        preview={preview}
        active={form.reviewStatus === "needs_review"}
        editing={false}
        canEdit={false}
        onToggleEdit={noop}
        onSplit={noop}
        onMerge={noop}
        onReset={noop}
      >
        <p className="text-xs text-muted-foreground">
          Harakat: {harakatSourceLabel(form.harakatSource)}. Splitter {form.splitterVersion}.
          {form.aiCheckedAt ? " AI checked." : " Not AI checked yet."}
        </p>
        {diff && (
          <div className="space-y-1 rounded-md border border-amber-400/50 bg-amber-50/50 p-2 text-xs dark:bg-amber-500/10">
            <p className="font-medium">The author edited this split.</p>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">Rules:</span>
              {diff.splitter ? (
                <span className="font-arabic text-base" dir="rtl">{diff.splitter.join(" | ")}</span>
              ) : (
                <span>the rules cannot split this word</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">Edited:</span>
              <span className="font-arabic text-base" dir="rtl">
                {diff.stored.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && " | "}
                    <span className={cn(diff.changed[i] && "rounded-sm bg-amber-200/70 dark:bg-amber-500/30")}>{t}</span>
                  </React.Fragment>
                ))}
              </span>
            </div>
          </div>
        )}
        {flags.length > 0 && (
          <ul className="space-y-1 text-xs">
            {flags.map((flag, i) => {
              const v = qaFlagView(flag, form.units);
              return (
                <li key={i} className={v.blocking ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"}>
                  <span className="font-medium">{v.title}</span> ({v.source}){v.message ? `: ${v.message}` : ""}
                  {v.suggestion && (
                    <>
                      {" "}Expected: <span className="font-arabic text-sm" dir="rtl">{v.suggestion}</span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </BlendFormColumn>

      <div
        ref={splitRef}
        aria-current={splitFocused ? "true" : undefined}
        className={cn(split && "rounded-md border p-2", splitFocused && "border-primary ring-2 ring-primary/30")}
      >
        <SplitReviewControls status={splitReviewLine(form)} onReview={onReviewSplit} handleRef={split?.handleRef} />
      </div>

      <FormAudioPanel
        takes={form.takes}
        units={form.units}
        generationOff={generationOff}
        onGenerate={onGenerate}
        onReviewTake={onReviewTake}
        onSaveMarks={onSaveMarks}
        takeRowProps={takeRowProps}
      />
    </div>
  );
}
