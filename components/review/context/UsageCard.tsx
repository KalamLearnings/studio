"use client";

/**
 * The "Where it is used" context card (CW-5, CM-USAGE): the count line the
 * panes always had, and under it the word's uses from `GET /words/:id/usage`
 * grouped by curriculum and node, each with the role the word plays and an
 * "Open in builder" link (the drafts pane's `/curricula/:id/builder`).
 */

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useWordUsage } from "@/lib/hooks/useWordUsage";
import { builderHref, groupUsage } from "@/lib/words/usage";
import { ContextCard } from "../parts";

const ROLE_LABEL = { target: "Target", distractor: "Distractor", exposure: "Seen" } as const;

export function UsageCard({ wordId, countLine }: { wordId: string | null; countLine: string }) {
  const usage = useWordUsage(wordId);
  const groups = React.useMemo(() => groupUsage(usage.data ?? []), [usage.data]);
  return (
    <ContextCard title="Where it is used">
      <p className="text-[12.5px]">{countLine}</p>
      {usage.isError && <p className="mt-1.5 text-xs text-muted-foreground">The uses could not be loaded.</p>}
      {groups.map((c) => {
        const href = builderHref(c.curriculumId);
        return (
          <div key={c.curriculumId || "none"} className="mt-2.5">
            <div className="text-xs font-semibold">{c.title || "Untitled curriculum"}</div>
            <ul className="mt-1 grid gap-1.5">
              {c.nodes.map((n) => (
                <li key={n.nodeId} className="text-[12.5px]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      {n.nodeTitle || "Untitled node"}
                      {n.topicTitle && <span className="text-muted-foreground"> · {n.topicTitle}</span>}
                    </span>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Open in builder <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <ul className="ps-3 text-xs text-muted-foreground">
                    {n.activities.map((a) => (
                      <li key={a.activityId}>
                        {a.type.replace(/_/g, " ")} · {a.roles.map((r) => ROLE_LABEL[r]).join(", ")}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </ContextCard>
  );
}
