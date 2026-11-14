"use client";

import * as React from "react";
import { Scissors, Link2, RotateCcw, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BlendFormPreview, PlainIssue, PreviewUnit } from "@/lib/soundBlend/preview";
import { unitLetters } from "@/lib/soundBlend/override";

/** The unit's bar, in the app's colours: blue short, sun long (madd), red closed. */
function kindBarClass(unit: PreviewUnit): string {
  if (unit.kind === "invalid") return "bg-destructive";
  if (unit.kind === null) return "bg-muted-foreground/40";
  if (unit.kind === "cvv" || unit.kind === "cvvc") return "bg-amber-400";
  if (unit.kind === "cvc" || unit.kind === "cvcc") return "bg-red-400";
  return "bg-blue-400";
}

export function IssueList({ issues }: { issues: PlainIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs">
      {issues.map((issue, i) => (
        <li
          key={i}
          className={cn(
            issue.severity === "error"
              ? "text-destructive"
              : "text-amber-700 dark:text-amber-400"
          )}
        >
          {issue.severity === "error" ? "Error: " : "Note: "}
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

interface BlendFormColumnProps {
  title: string;
  preview: BlendFormPreview;
  /** This is the form the activity uses (its `ending`). */
  active: boolean;
  editing: boolean;
  /** Editing is offered only for a split with no splitter error. */
  canEdit: boolean;
  onToggleEdit: () => void;
  onSplit: (unitIndex: number, at: number) => void;
  onMerge: (unitIndex: number) => void;
  onReset: () => void;
  children?: React.ReactNode;
}

/** One ending form of the word: its text, units in reading order, tags and issues. */
export function BlendFormColumn({
  title,
  preview,
  active,
  editing,
  canEdit,
  onToggleEdit,
  onSplit,
  onMerge,
  onReset,
  children,
}: BlendFormColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border-2 p-3",
        active ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap text-sm font-medium">{title}</span>
          {active && <Badge variant="default">Used here</Badge>}
          {preview.overridden && (
            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
              Edited split: needs review
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {preview.overridden && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={onToggleEdit}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap text-xs",
                editing ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Pencil className="h-3 w-3" /> {editing ? "Done" : "Edit split"}
            </button>
          )}
        </div>
      </div>

      <div className="font-arabic text-2xl text-center" dir="rtl">
        {preview.text}
      </div>

      {children}

      <div className="flex flex-wrap items-stretch justify-start gap-1" dir="rtl">
        {preview.units.map((unit, index) => (
          <React.Fragment key={`${unit.id}-${unit.text}`}>
            <div className="flex min-w-[64px] flex-col items-center gap-1 rounded-md border bg-background p-2">
              <div className="flex items-center font-arabic text-2xl" dir="rtl">
                {editing
                  ? unitLetters(unit.text).map((letter, li, all) => (
                      <React.Fragment key={li}>
                        <span>{letter}</span>
                        {li < all.length - 1 && (
                          <button
                            type="button"
                            title="Split here"
                            onClick={() => onSplit(index, li + 1)}
                            className="mx-0.5 rounded px-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Scissors className="h-3 w-3" />
                          </button>
                        )}
                      </React.Fragment>
                    ))
                  : unit.text}
              </div>
              <div className={cn("h-1.5 w-full rounded-full", kindBarClass(unit))} />
              {unit.kind && unit.kind !== "invalid" && (
                <span className="text-[10px] uppercase text-muted-foreground" dir="ltr">
                  {unit.kind}
                </span>
              )}
              {unit.tags.length > 0 && (
                <div className="flex max-w-[140px] flex-wrap justify-center gap-1" dir="ltr">
                  {unit.tags.map((t) => (
                    <span
                      key={t.tag}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground"
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {editing && index < preview.units.length - 1 && (
              <button
                type="button"
                title="Join with the next syllable"
                onClick={() => onMerge(index)}
                className="self-center rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <IssueList issues={preview.issues} />
    </div>
  );
}
