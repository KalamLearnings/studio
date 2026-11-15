"use client";

/**
 * Decodability findings (CM-S11; backend CM-B34): for each failing word, the
 * word, each unit it needs, whether a later lesson teaches it (preview) or
 * nothing does yet (untaught), and the stage that teaches it. Warnings only:
 * a person's save is never blocked by them.
 */

import * as React from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Info } from "lucide-react";
import {
  decodabilitySummary,
  describeMissingUnit,
  describeOtherFinding,
  groupDecodability,
  pointStageNote,
  sortStories,
  type DecodabilityReport,
  type StoryDecodability,
} from "@/lib/teachingTargets/decodability";
import type { LetterLookup } from "@/lib/teachingTargets/units";

/** One report: its headline and each failing word. Reusable for a phrase's report. */
export function DecodabilityReportView({
  report,
  letter,
}: {
  report: DecodabilityReport | null;
  letter?: LetterLookup;
}) {
  const grouped = React.useMemo(() => groupDecodability(report?.findings ?? []), [report]);
  const note = pointStageNote(report);
  const ok = report?.decodable === true;
  const Icon = !report ? Info : ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className="space-y-1.5 text-sm">
      <p className="flex gap-2">
        <Icon
          className={
            "mt-0.5 h-4 w-4 shrink-0 " +
            (!report ? "text-muted-foreground" : ok ? "text-emerald-600" : "text-amber-600")
          }
        />
        <span>{decodabilitySummary(report)}</span>
      </p>
      {note && <p className="ml-6 text-xs text-muted-foreground">{note}</p>}
      {grouped.words.length > 0 && (
        <ul className="ml-6 space-y-1.5">
          {grouped.words.map((w) => (
            <li key={w.wordId}>
              <span className="font-arabic text-lg" dir="rtl" lang="ar">
                {w.text}
              </span>
              {w.heartWord && (
                <span className="ml-2 text-xs text-muted-foreground">
                  heart word {w.heartWord}; excused only after its lesson
                </span>
              )}
              <ul className="ml-3 list-disc pl-3 text-xs text-muted-foreground">
                {w.missing.map((m) => (
                  <li key={m.unit}>needs {describeMissingUnit(m, letter)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {grouped.other.length > 0 && (
        <ul className="ml-6 space-y-1 text-xs">
          {grouped.other.map((f, i) => (
            <li key={`${f.code}-${i}`}>{describeOtherFinding(f)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The story nodes of a topic or level, each with its book's decodability at the node. */
export function StoryDecodabilityList({
  stories,
  nodeTitle,
  letter,
}: {
  stories: readonly StoryDecodability[];
  nodeTitle: (nodeId: string) => string | undefined;
  letter?: LetterLookup;
}) {
  const sorted = React.useMemo(() => sortStories(stories), [stories]);
  if (sorted.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Story decodability</h4>
      <ul className="space-y-2">
        {sorted.map((s) => (
          <li key={s.node_id} className="rounded-md border p-3">
            <p className="mb-2 flex items-center gap-1 text-sm font-medium">
              <BookOpen className="h-3.5 w-3.5 text-amber-500" />
              {nodeTitle(s.node_id) ?? "Story node"}
            </p>
            <DecodabilityReportView report={s.report} letter={letter} />
          </li>
        ))}
      </ul>
    </div>
  );
}
