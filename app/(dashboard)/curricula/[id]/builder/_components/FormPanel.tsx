"use client";

import { ActivityForm } from "@/components/builder/activity-form";
import { ExemplarToggle } from "@/components/builder/ExemplarToggle";
import type { Topic } from "@/lib/schemas/curriculum";
import type { ActivityConfig } from "@/components/builder/forms/types";

interface FormPanelProps {
  /** Remounts the form when the edited entity changes, resetting its state. */
  formKey?: string;
  activityId?: string;
  activityType?: string;
  config?: ActivityConfig;
  instruction?: string;
  instructionAudioUrl?: string | null;
  instructionVoiceId?: string | null;
  topic: Topic | null;
  /** The node the activity sits in (or will, for a new one). */
  nodeId?: string;
  /** The saved activity's generation columns (CM-S9). */
  isExemplar?: boolean;
  isAiDraft?: boolean;
  isPublished?: boolean;
  isNew: boolean;
  onSave?: (data: Record<string, unknown>) => Promise<unknown> | void;
  onCancel?: () => void;
}

export function FormPanel({
  formKey,
  activityId,
  activityType,
  config,
  instruction,
  instructionAudioUrl,
  instructionVoiceId,
  topic,
  nodeId,
  isExemplar,
  isAiDraft,
  isPublished,
  isNew,
  onSave,
  onCancel,
}: FormPanelProps) {
  return (
    <div className="flex-1 overflow-hidden bg-background">
      {!isNew && activityId && (
        <ExemplarToggle
          activityId={activityId}
          isExemplar={!!isExemplar}
          isAiDraft={!!isAiDraft}
          isPublished={!!isPublished}
        />
      )}
      <ActivityForm
        key={formKey}
        activityId={activityId}
        activityType={activityType}
        config={config}
        instruction={instruction}
        instructionAudioUrl={instructionAudioUrl}
        instructionVoiceId={instructionVoiceId}
        topic={topic}
        nodeId={nodeId}
        isNew={isNew}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}
