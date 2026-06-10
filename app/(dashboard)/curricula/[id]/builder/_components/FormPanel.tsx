"use client";

import { ActivityForm } from "@/components/builder/activity-form";
import type { Topic } from "@/lib/schemas/curriculum";
import type { NewActivityState } from "../_hooks";

interface FormPanelProps {
  activityType?: string;
  topic: Topic | null;
  isNew: boolean;
  onSave?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function FormPanel({
  activityType,
  topic,
  isNew,
  onSave,
  onCancel,
}: FormPanelProps) {
  return (
    <div className="flex-1 overflow-hidden bg-background">
      <ActivityForm
        activityType={activityType}
        topic={topic}
        isNew={isNew}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}
