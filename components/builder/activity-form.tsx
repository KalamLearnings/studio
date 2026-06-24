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
  /** Saved instruction audio URL — shows the play button and lets save reuse it. */
  instructionAudioUrl?: string | null;
  /** Activity id (edit mode) — embedded in auto-generated audio filenames. */
  activityId?: string;
  topic?: TopicContext | null;
  isNew?: boolean;
  onSave?: (data: Record<string, unknown>) => void | Promise<void>;
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
  activityId,
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
  // Original instruction text at mount — used to detect whether the text changed
  // (so we can auto-regenerate audio to match it on save).
  const originalInstruction = React.useRef(initialInstruction);
  const [selectedVoice, setSelectedVoice] = React.useState<string | undefined>(undefined);
  const [generatedAudio, setGeneratedAudio] = React.useState<{
    blob: Blob;
    blobUrl: string;
    filePath: string;
  } | null>(null);
  // Initialize from the saved activity's audio so the play button shows on
  // reopen and save can reuse it when nothing changed.
  const [existingAudioUrl, setExistingAudioUrl] = React.useState<string | null>(
    instructionAudioUrl,
  );
  // Blocks the Save/Create button while instruction audio is generated/uploaded.
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

  // Clean up blob URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (generatedAudio?.blobUrl) {
        URL.revokeObjectURL(generatedAudio.blobUrl);
      }
    };
  }, [generatedAudio]);

  // Handle config changes
  const handleConfigChange = (newConfig: ActivityConfig) => {
    setLocalConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // Handle audio generation callback
  const handleAudioGenerated = (blob: Blob, blobUrl: string, filePath: string) => {
    // Clean up old blob URL
    if (generatedAudio?.blobUrl) {
      URL.revokeObjectURL(generatedAudio.blobUrl);
    }
    setGeneratedAudio({ blob, blobUrl, filePath });
    setExistingAudioUrl(null);
  };

  // Handle save.
  //
  // Instruction audio is auto-generated on save so creators don't have to do it
  // as a separate step. Decision table for what audio_url to persist:
  //   - no instruction text                  -> no audio
  //   - manual audio generated in this form  -> upload + use it
  //   - text present, no existing audio       -> auto-generate
  //   - text changed vs. original             -> auto-regenerate to match
  //   - text unchanged, audio exists          -> reuse existing (no TTS call)
  // The save is blocked (isSaving) while any TTS/upload runs.
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const text = instruction.trim();
      let audioUrl = existingAudioUrl;

      if (!text) {
        // No instruction text -> no audio.
        audioUrl = null;
      } else if (generatedAudio) {
        // Creator generated audio manually in this form; upload that exact blob.
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("curriculum-audio")
          .upload(generatedAudio.filePath, generatedAudio.blob, {
            contentType: "audio/mpeg",
            cacheControl: "31536000",
            upsert: true,
          });
        if (error) throw error;
        audioUrl = generatedAudio.filePath;
      } else {
        const textChanged = text !== originalInstruction.current.trim();
        if (!existingAudioUrl || textChanged) {
          // Auto-generate (no audio yet) or auto-regenerate (text changed).
          const { generateInstructionAudio } = await import(
            "@/lib/audio/generateInstructionAudio"
          );
          const { filePath } = await generateInstructionAudio({
            text,
            voiceId: selectedVoice,
            activityId,
          });
          audioUrl = filePath;
        }
        // else: text unchanged and audio exists -> reuse existingAudioUrl as-is.
      }

      // Await the parent's save (create/update + post-save selection) so the
      // form keeps its loading state until the whole flow finishes.
      await onSave?.({
        config: localConfig,
        instruction,
        audioUrl,
        voiceId: selectedVoice,
      });
    } catch (error) {
      console.error("Error saving activity / generating instruction audio:", error);
      // Surface the failure so the creator can retry rather than silently
      // saving without audio.
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
              onAudioGenerated={handleAudioGenerated}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
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
