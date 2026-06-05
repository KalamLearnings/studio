"use client";

/**
 * AvailabilityManager
 *
 * Shared UI for managing curriculum-access rules on a Book or Game.
 * A rule = a curriculum + an optional topic prerequisite.
 * - No prerequisite  -> available immediately in that curriculum (store_always)
 * - With prerequisite -> unlocks after completing a topic (store_unlockable)
 *
 * The parent owns the data + mutations; this component is presentational
 * so it can be reused identically by both books and games editors.
 */

import * as React from "react";
import { Plus, Trash2, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurricula } from "@/lib/hooks/useCurriculum";
import { useTopics } from "@/lib/hooks/useTopics";

/** Minimal shape shared by BookAvailability and GameAvailability. */
export interface AvailabilityRule {
  id: string;
  curriculum_id: string | null;
  curriculum_name: string | null;
  prerequisite_topic_id: string | null;
  prerequisite_topic_name: string | null;
}

export interface NewAvailabilityInput {
  curriculum_id: string;
  prerequisite_topic_id?: string;
}

interface AvailabilityManagerProps {
  rules: AvailabilityRule[];
  isLoading?: boolean;
  isCreating?: boolean;
  deletingRuleId?: string | null;
  onCreate: (input: NewAvailabilityInput) => void;
  onDelete: (ruleId: string) => void;
}

export function AvailabilityManager({
  rules,
  isLoading = false,
  isCreating = false,
  deletingRuleId = null,
  onCreate,
  onDelete,
}: AvailabilityManagerProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [curriculumId, setCurriculumId] = React.useState("");
  const [topicId, setTopicId] = React.useState<string>("");

  const { data: curricula } = useCurricula();
  const { data: topics } = useTopics(curriculumId || null);

  const resetForm = React.useCallback(() => {
    setCurriculumId("");
    setTopicId("");
  }, []);

  const handleSubmit = () => {
    if (!curriculumId) return;
    onCreate({
      curriculum_id: curriculumId,
      prerequisite_topic_id: topicId || undefined,
    });
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Curriculum Access ({rules.length})</h3>
          <p className="text-sm text-muted-foreground">
            Control which curricula this is available in, and whether it unlocks
            after a topic.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Curriculum
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No curriculum access yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a curriculum to make this visible to its learners.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <div className="font-medium">
                  {rule.curriculum_name || rule.curriculum_id}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rule.prerequisite_topic_id
                    ? `Unlocks after: ${
                        rule.prerequisite_topic_name || rule.prerequisite_topic_id
                      }`
                    : "Available immediately"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => onDelete(rule.id)}
                disabled={deletingRuleId === rule.id}
              >
                {deletingRuleId === rule.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Curriculum Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Curriculum</Label>
              <Select
                value={curriculumId}
                onValueChange={(v) => {
                  setCurriculumId(v);
                  setTopicId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a curriculum" />
                </SelectTrigger>
                <SelectContent>
                  {(curricula ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title?.en || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {curriculumId && (
              <div className="space-y-2">
                <Label>Unlock after topic (optional)</Label>
                <Select
                  value={topicId || "none"}
                  onValueChange={(v) => setTopicId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Available immediately" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Available immediately</SelectItem>
                    {(topics ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title?.en || t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave as &quot;Available immediately&quot; to show it in the
                  store right away, or pick a topic the learner must complete
                  first.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!curriculumId || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
