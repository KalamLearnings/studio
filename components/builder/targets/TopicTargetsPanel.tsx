"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { isTargetsError, useSaveTopicTargets, useTopicRollup } from "@/lib/hooks/useRollup";
import { declaredFocus, targetIssuesByIndex } from "@/lib/teachingTargets/findings";
import {
  ROLES_BY_SCOPE,
  addKeys,
  describeUnitKey,
  issuesByRole,
  toTargetInputs,
  type TargetsByRole,
} from "@/lib/teachingTargets/units";
import { FindingsPanel } from "./FindingsPanel";
import { TargetListEditor } from "./TargetListEditor";
import type { IntentContext } from "./types";

interface TopicTargetsPanelProps {
  topicId: string;
  topicTitle: string;
  ctx: IntentContext;
}

/**
 * A topic's page in the form pane: its declared focus, review and
 * prerequisite targets, and its roll-up findings grouped by activity.
 * Remount per topic (`key`) so the draft resets.
 */
export function TopicTargetsPanel({ topicId, topicTitle, ctx }: TopicTargetsPanelProps) {
  const rollup = useTopicRollup(ctx.curriculumId, topicId);
  const save = useSaveTopicTargets();
  const [draft, setDraft] = React.useState<TargetsByRole | null>(null);
  const [issues, setIssues] = React.useState<Map<number, string[]>>(new Map());
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const saved: TargetsByRole | null = React.useMemo(
    () =>
      rollup.data
        ? {
            focus: declaredFocus(rollup.data),
            review: [...rollup.data.review],
            prerequisite: [...rollup.data.prerequisites],
          }
        : null,
    [rollup.data],
  );
  const current = draft ?? saved;
  const dirty = draft !== null;
  const legacyFocus =
    rollup.data?.focus_source === "legacy" ? rollup.data.focus : [];
  const roleIssues = current ? issuesByRole("topic", current, issues) : {};

  const setRole = (role: keyof TargetsByRole) => (keys: string[]) => {
    setIssues(new Map());
    setDraft({ ...(current ?? {}), [role]: keys });
  };

  const onSave = () => {
    if (!current) return;
    save.mutate(
      { curriculumId: ctx.curriculumId, topicId, targets: toTargetInputs("topic", current) },
      {
        onSuccess: () => {
          setDraft(null);
          setIssues(new Map());
          setSaveError(null);
        },
        onError: (error) => {
          if (!isTargetsError(error)) return;
          setIssues(targetIssuesByIndex(error.details));
          setSaveError(error.message);
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Topic</p>
          <h2 className="font-semibold">{topicTitle}</h2>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="outline" size="sm" onClick={() => { setDraft(null); setIssues(new Map()); setSaveError(null); }}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={onSave} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save targets"}
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {saveError && (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            Not saved. {saveError}
          </p>
        )}
        {rollup.isLoading || !current ? (
          <p className="text-sm text-muted-foreground">
            {rollup.error ? `Could not load targets: ${rollup.error.message}` : "Loading targets…"}
          </p>
        ) : (
          <section className="space-y-4">
            {legacyFocus.length > 0 && (current.focus ?? []).length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-sm">
                No focus is declared yet. The findings use the topic&apos;s letter:{" "}
                <span className="font-medium">
                  {legacyFocus.map((k) => describeUnitKey(k, ctx.letterLookup)).join(", ")}
                </span>
                .{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setRole("focus")(addKeys([], legacyFocus))}
                >
                  Use it as the focus
                </button>
              </div>
            )}
            {ROLES_BY_SCOPE.topic.map((role) => (
              <TargetListEditor
                key={role}
                role={role}
                keys={current[role] ?? []}
                onChange={setRole(role)}
                letterLookup={ctx.letterLookup}
                issues={roleIssues[role]}
              />
            ))}
          </section>
        )}

        <FindingsPanel
          findings={rollup.data?.findings ?? []}
          isLoading={rollup.isLoading}
          error={rollup.error}
          activityLabel={ctx.activityLabel}
          onOpenActivity={ctx.onOpenActivity}
          describe={ctx.describe}
          scopeName={ctx.scopeName}
          stories={rollup.data?.story_decodability}
          nodeTitle={ctx.nodeTitle}
        />
      </div>
    </div>
  );
}
