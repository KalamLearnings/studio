"use client";

import { ActivityForm } from "@/components/builder/activity-form";
import type { Topic } from "@/lib/schemas/curriculum";
import type { ActivityConfig } from "@/components/builder/forms/types";

interface FormPanelProps {
  /** Remounts the form when the edited entity changes, resetting its state. */
  formKey?: string;
  activityType?: string;
  config?: ActivityConfig;
  instruction?: string;
  instructionAudioUrl?: string | null;
  topic: Topic | null;
  isNew: boolean;
  onSave?: (data: Record<string, unknown>) => Promise<unknown> | void;
  onCancel?: () => void;
}

export function FormPanel({
  formKey,
  activityType,
  config,
  instruction,
  instructionAudioUrl,
  topic,
  isNew,
  onSave,
  onCancel,
}: FormPanelProps) {
  return (
    <div className="flex-1 overflow-hidden bg-background">
      <ActivityForm
        key={formKey}
        activityType={activityType}
        config={config}
        instruction={instruction}
        instructionAudioUrl={instructionAudioUrl}
        topic={topic}
        isNew={isNew}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}
