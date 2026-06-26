"use client";

import * as React from "react";
import { Save, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioInputField } from "@/components/audio/AudioInputField";
import {
  getActivityFormComponent,
  getActivityFormOptions,
  type ActivityConfig,
  type TopicContext,
} from "./forms";
import { normalizeActivityConfig } from "./forms/normalizeActivityConfig";

interface ActivityFormProps {
  activityType?: string;
  config?: ActivityConfig;
  instruction?: string;
  /** Saved instruction audio URL — shown by the play button for preview. */
  instructionAudioUrl?: string | null;
  topic?: TopicContext | null;
  isNew?: boolean;
  /**
   * Persists the activity. Receives intent only (config, instruction text,
   * voiceId, regenerateAudio) and resolves to the saved activity returned by the
   * backend so the form can read back the server-owned `instruction.audio_url`.
   */
  onSave?: (data: Record<string, unknown>) => Promise<unknown> | void;
  onCancel?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onConfigChange?: (config: ActivityConfig) => void;
}

export function ActivityForm({
  activityType,
  config = {},
  instruction: initialInstruction = "",
  instructionAudioUrl = null,
  topic,
  isNew = false,
  onSave,
  onCancel,
  onDelete,
  onDuplicate,
  onConfigChange,
}: ActivityFormProps) {
  const [localConfig, setLocalConfig] = React.useState<ActivityConfig>(() =>
    normalizeActivityConfig(activityType, config),
  );
  const [instruction, setInstruction] = React.useState(initialInstruction);
  const [selectedVoice, setSelectedVoice] = React.useState<string | undefined>(undefined);
  // Whether the backend should (re)generate instruction audio on save. The
  // AudioInputField auto-checks this when the text or voice changes and lets the
  // creator toggle it manually. Irrelevant on create (backend always generates).
  const [regenerateAudio, setRegenerateAudio] = React.useState(false);
  // The saved instruction audio URL, shown by the play button. Initialized from
  // the activity and refreshed from the save response so the new clip plays
  // without a page refresh.
  const [existingAudioUrl, setExistingAudioUrl] = React.useState<string | null>(
    instructionAudioUrl,
  );
  // Blocks the Save/Create button while the save (incl. backend TTS) runs.
  const [isSaving, setIsSaving] = React.useState(false);

  // Get letter data from topic if available
  const letterData = topic?.letter || (topic as any)?.letters || null;

  // Note: state initializes from props on mount. The parent passes a stable
  // `key` per edited activity, so the form remounts (and re-reads config /
  // instruction) whenever the selected activity changes — no sync effect needed.

  // Get the form component for this activity type
  const FormComponent = activityType
    ? getActivityFormComponent(activityType)
    : null;

  // Get form options
  const formOptions = activityType
    ? getActivityFormOptions(activityType)
    : {};

  // Handle config changes
  const handleConfigChange = (newConfig: ActivityConfig) => {
    setLocalConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // Handle save.
  //
  // The client no longer generates or uploads instruction audio — the BACKEND
  // owns it. We pass intent only: the instruction text, the chosen voice, and
  // `regenerateAudio` (whether the backend should overwrite the existing clip).
  // On create the backend always generates, so the flag is ignored there.
  //
  // `onSave` resolves to the saved activity returned by the backend; we read its
  // `instruction.audio_url` back into local state so the play button reflects the
  // new clip without a page refresh.
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await onSave?.({
        config: localConfig,
        instruction,
        voiceId: selectedVoice,
        regenerateAudio,
      });

      // Adopt the backend's audio_url (source of truth) and disarm the flag.
      const savedAudioUrl =
        (saved as { instruction?: { audio_url?: string | null } } | undefined)
          ?.instruction?.audio_url ?? null;
      setExistingAudioUrl(savedAudioUrl);
      setRegenerateAudio(false);
    } catch (error) {
      console.error("Error saving activity:", error);
      // Surface the failure so the creator can retry.
      const message = error instanceof Error ? error.message : "Failed to save";
      window.alert(`Could not save activity: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activityType) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-muted p-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
        <h3 className="mt-4 font-medium">No Activity Selected</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Select an activity from the tree to edit its content
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isNew ? "New Activity" : "Editing Activity"}
          </p>
          <h3 className="text-lg font-semibold capitalize">
            {activityType.replace(/_/g, " ")}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isNew ? (
            <>
              <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving…" : "Create Activity"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onDuplicate} disabled={isSaving}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} disabled={isSaving}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Instruction with TTS - hide for certain activity types */}
          {!formOptions.hideInstruction && (
            <AudioInputField
              mode="instruction"
              value={instruction}
              onChange={setInstruction}
              letterData={letterData}
              required={false}
              existingAudioUrl={existingAudioUrl}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              // Regenerate is only meaningful when editing; on create the backend
              // always generates, so hide the checkbox.
              showRegenerate={!isNew}
              regenerateAudio={regenerateAudio}
              onRegenerateAudioChange={setRegenerateAudio}
            />
          )}

          {/* Activity-specific form */}
          {FormComponent && (
            <div className="pt-4 border-t">
              <FormComponent
                config={localConfig}
                onChange={handleConfigChange}
                topic={topic}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
