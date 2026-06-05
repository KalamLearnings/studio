"use client";

/**
 * Camel Narration Activity Form
 *
 * The camel mascot appears and speaks narration audio.
 * V2 now matches V1 with AudioPicker support.
 */

import * as React from "react";
import { FormField, AudioPickerField, PreviewBox } from "./shared";
import type { BaseActivityFormProps } from "./types";

type CamelPose = "wave" | "point" | "dance" | "happy" | "thinking";

interface NarrationStep {
  audioId?: string;
  audioUrl?: string;
  pose?: CamelPose;
}

interface CamelNarrationConfig {
  narrationSteps?: NarrationStep[];
}

const CAMEL_POSES: { value: CamelPose; label: string; emoji: string }[] = [
  { value: "wave", label: "Waving", emoji: "👋" },
  { value: "point", label: "Pointing", emoji: "👉" },
  { value: "dance", label: "Dancing", emoji: "💃" },
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "thinking", label: "Thinking", emoji: "🤔" },
];

export function CamelNarrationActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<CamelNarrationConfig>) {
  const narrationSteps = config?.narrationSteps || [];
  const currentStep = narrationSteps[0] || {};
  const currentPose = currentStep.pose || "wave";

  const updateConfig = (updates: Partial<CamelNarrationConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleAudioChange = (audioUrl: string | undefined, audioId?: string) => {
    if (audioUrl) {
      const newStep: NarrationStep = {
        audioId,
        audioUrl,
        pose: currentPose,
      };
      updateConfig({ narrationSteps: [newStep] });
    } else {
      updateConfig({ narrationSteps: [] });
    }
  };

  const handlePoseChange = (pose: CamelPose) => {
    if (narrationSteps.length > 0) {
      const updatedStep = { ...currentStep, pose };
      updateConfig({ narrationSteps: [updatedStep] });
    }
  };

  const hasAudio = !!currentStep.audioUrl;

  return (
    <div className="space-y-4">
      <PreviewBox variant="info" icon={false}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐪</span>
          <div>
            <p className="font-medium">Camel Mascot Narration</p>
            <p className="text-sm text-muted-foreground">
              The camel mascot will appear and speak this narration.
            </p>
          </div>
        </div>
      </PreviewBox>

      <AudioPickerField
        label="Narration Audio"
        hint="Select the audio clip the camel mascot will speak"
        value={currentStep.audioUrl}
        audioId={currentStep.audioId}
        onChange={handleAudioChange}
        required
      />

      {hasAudio && (
        <FormField
          label="Camel Pose"
          hint="How the camel will animate while speaking"
        >
          <div className="grid grid-cols-5 gap-2">
            {CAMEL_POSES.map((pose) => (
              <button
                key={pose.value}
                type="button"
                onClick={() => handlePoseChange(pose.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                  currentPose === pose.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-xl">{pose.emoji}</span>
                <span className="text-xs">{pose.label}</span>
              </button>
            ))}
          </div>
        </FormField>
      )}

      {hasAudio && (
        <PreviewBox variant="preview" title="Preview">
          The camel will appear in <strong>{currentPose}</strong> pose and speak
          the selected audio narration.
        </PreviewBox>
      )}
    </div>
  );
}
