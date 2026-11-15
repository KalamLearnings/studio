"use client";

import * as React from "react";
import { STAGE_LABELS } from "@kalam/curriculum-schemas";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isTargetsError, useCurriculumRollup, useSaveLevelIntent } from "@/lib/hooks/useRollup";
import { targetIssuesByIndex } from "@/lib/teachingTargets/findings";
import {
  ROLES_BY_SCOPE,
  issuesByRole,
  stageLabelText,
  toTargetInputs,
  type TargetsByRole,
} from "@/lib/teachingTargets/units";
import { FindingsPanel } from "./FindingsPanel";
import { TargetListEditor } from "./TargetListEditor";
import type { IntentContext } from "./types";

const NO_STAGE = "__none__";

interface LevelDraft {
  stage: string | null;
  targets: TargetsByRole;
}

interface LevelTargetsPanelProps {
  levelTitle: string;
  ctx: IntentContext;
}

/**
 * The level's page in the form pane (shown when nothing in the tree is
 * selected): its stage label, objective and prerequisite targets, and every
 * roll-up finding of the level grouped by activity.
 */
export function LevelTargetsPanel({ levelTitle, ctx }: LevelTargetsPanelProps) {
  const rollup = useCurriculumRollup(ctx.curriculumId);
  const save = useSaveLevelIntent();
  const [draft, setDraft] = React.useState<LevelDraft | null>(null);
  const [issues, setIssues] = React.useState<Map<number, string[]>>(new Map());
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const saved: LevelDraft | null = React.useMemo(
    () =>
      rollup.data
        ? {
            stage: rollup.data.stage,
            targets: {
              objective: [...rollup.data.objectives],
              prerequisite: [...rollup.data.prerequisites],
            },
          }
        : null,
    [rollup.data],
  );
  const current = draft ?? saved;
  const dirty = draft !== null;
  const roleIssues = current ? issuesByRole("curriculum", current.targets, issues) : {};

  const update = (next: Partial<LevelDraft>) => {
    if (!current) return;
    setIssues(new Map());
    setDraft({ ...current, ...next });
  };

  const onSave = () => {
    if (!current) return;
    save.mutate(
      {
        curriculumId: ctx.curriculumId,
        stage: current.stage,
        targets: toTargetInputs("curriculum", current.targets),
      },
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
          <p className="text-xs uppercase text-muted-foreground">Level</p>
          <h2 className="font-semibold">{levelTitle}</h2>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="outline" size="sm" onClick={() => { setDraft(null); setIssues(new Map()); setSaveError(null); }}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={onSave} disabled={!dirty || save.isPending}>
            {save.isPending ? "Saving…" : "Save level"}
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {saveError && (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive">
            Not saved. {saveError}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Select an activity, node or topic in the tree to edit it.
        </p>
        {rollup.isLoading || !current ? (
          <p className="text-sm text-muted-foreground">
            {rollup.error ? `Could not load the level: ${rollup.error.message}` : "Loading level…"}
          </p>
        ) : (
          <section className="space-y-4">
            <div className="space-y-2">
              <div>
                <h4 className="text-sm font-medium">Stage</h4>
                <p className="text-xs text-muted-foreground">
                  What this level is about. The teaching sequence decides the order.
                </p>
              </div>
              <Select
                value={current.stage ?? NO_STAGE}
                onValueChange={(v) => update({ stage: v === NO_STAGE ? null : v })}
              >
                <SelectTrigger className="h-9 w-64">
                  <SelectValue placeholder="No stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STAGE}>No stage</SelectItem>
                  {STAGE_LABELS.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stageLabelText(stage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ROLES_BY_SCOPE.curriculum.map((role) => (
              <TargetListEditor
                key={role}
                role={role}
                keys={current.targets[role] ?? []}
                onChange={(keys) => update({ targets: { ...current.targets, [role]: keys } })}
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
