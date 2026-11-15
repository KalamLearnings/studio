"use client";

import * as React from "react";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FINDING_CODES,
  FINDING_META,
  countFindings,
  describeFinding,
  groupFindings,
  type DescribeContext,
  type FindingCode,
  type RollupFinding,
} from "@/lib/teachingTargets/findings";
import type { StoryDecodability } from "@/lib/teachingTargets/decodability";
import { StoryDecodabilityList } from "./DecodabilityFindings";

export interface ActivityLabel {
  title: string;
  /** Where it sits, e.g. "Topic 3 · Node 2". */
  where?: string;
}

interface FindingsPanelProps {
  findings: RollupFinding[];
  isLoading?: boolean;
  error?: Error | null;
  /** How an activity id reads (its type and place); unknown ids show the id. */
  activityLabel: (id: string) => ActivityLabel | undefined;
  onOpenActivity: (id: string) => void;
  describe: DescribeContext;
  /** What findings without an activity are about: "This level", a topic's title. */
  scopeName: (scopeType: "curriculum" | "topic", scopeId: string) => string;
  /** Story nodes' book decodability (CM-B34), sent only when the scope has story nodes. */
  stories?: readonly StoryDecodability[];
  nodeTitle?: (nodeId: string) => string | undefined;
}

function FindingLine({ finding, describe }: { finding: RollupFinding; describe: DescribeContext }) {
  const meta = FINDING_META[finding.code];
  const Icon = meta?.tone === "note" ? Info : AlertTriangle;
  return (
    <li className="flex gap-2 text-sm">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          meta?.tone === "note" ? "text-muted-foreground" : "text-amber-600",
        )}
      />
      <span>
        <span className="font-medium">{meta?.title ?? finding.code}.</span>{" "}
        {describeFinding(finding, describe)}
      </span>
    </li>
  );
}

/**
 * The roll-up findings of a topic or a level, grouped by activity with a link
 * to open each activity, and the scope's own findings first.
 */
export function FindingsPanel({
  findings,
  isLoading,
  error,
  activityLabel,
  onOpenActivity,
  describe,
  scopeName,
  stories = [],
  nodeTitle = () => undefined,
}: FindingsPanelProps) {
  const [only, setOnly] = React.useState<FindingCode | null>(null);
  const counts = React.useMemo(() => countFindings(findings), [findings]);
  const shown = React.useMemo(
    () => (only ? findings.filter((f) => f.code === only) : findings),
    [findings, only],
  );
  const grouped = React.useMemo(() => groupFindings(shown), [shown]);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">Findings</h3>
        <p className="text-xs text-muted-foreground">
          What the activities teach, compared with what is declared above.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading findings…</p>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load findings: {error.message}</p>
      ) : findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No findings. The activities match the targets.</p>
      ) : null}

      {isLoading || error || findings.length === 0 ? null : (
        <>
          <div className="flex flex-wrap gap-2">
            {FINDING_CODES.filter((c) => counts[c].findings > 0).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={only === code}
                title={only === code ? "Show all findings" : "Show only these"}
                onClick={() => setOnly(only === code ? null : code)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  only === code && "border-primary bg-primary/10",
                )}
              >
                {FINDING_META[code].title}: {counts[code].findings}
                {counts[code].activities > 0 && ` in ${counts[code].activities} activities`}
              </button>
            ))}
          </div>

          {grouped.byScope.map((group) => (
            <div key={`${group.scope_type}:${group.scope_id}`} className="rounded-md border p-3">
              <h4 className="mb-2 text-sm font-medium">
                {scopeName(group.scope_type, group.scope_id)}
              </h4>
              <ul className="space-y-1.5">
                {group.findings.map((f, i) => (
                  <FindingLine key={`${f.code}-${f.unit ?? ""}-${i}`} finding={f} describe={describe} />
                ))}
              </ul>
            </div>
          ))}

          <ul className="space-y-2">
            {grouped.byActivity.map(({ activityId, findings: list }) => {
              const label = activityLabel(activityId);
              return (
                <li key={activityId} className="rounded-md border p-3">
                  <button
                    type="button"
                    className="mb-2 flex items-center gap-1 text-left text-sm font-medium text-primary hover:underline"
                    onClick={() => onOpenActivity(activityId)}
                  >
                    {label?.title ?? activityId}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  {label?.where && (
                    <p className="-mt-1.5 mb-2 text-xs text-muted-foreground">{label.where}</p>
                  )}
                  <ul className="space-y-1.5">
                    {list.map((f, i) => (
                      <FindingLine key={`${f.code}-${f.unit ?? ""}-${i}`} finding={f} describe={describe} />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!isLoading && !error && (
        <StoryDecodabilityList stories={stories} nodeTitle={nodeTitle} letter={describe.letter} />
      )}
    </section>
  );
}
