"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FormField, Checkbox, AnimationLibraryModal, AudioPickerField } from "./shared";
import type { BaseActivityFormProps, AnimationIntroConfig } from "./types";

/**
 * Form for animation_intro activity.
 * Plays an uploaded Rive (.riv) animation as intro content; narration audio
 * comes from the activity's instruction audio like other intro activities.
 */
export function AnimationIntroForm({
  config,
  onChange,
}: BaseActivityFormProps<AnimationIntroConfig>) {
  const [showAnimationLibrary, setShowAnimationLibrary] = React.useState(false);

  const animationUrl = config?.animationUrl || "";
  const loop = config?.loop ?? true;

  const updateConfig = (updates: Partial<AnimationIntroConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Animation"
        hint="Select a Rive animation from the library or upload a new .riv file"
        required
      >
        {animationUrl ? (
          <div className="flex items-center gap-3 rounded-lg border-2 p-4 max-w-xs">
            <span className="text-3xl">🎬</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {decodeURIComponent(
                  animationUrl.split("/").pop() || "animation.riv"
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowAnimationLibrary(true)}
                  className="px-0"
                >
                  Change
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => updateConfig({ animationUrl: "" })}
                  className="px-0 text-destructive"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnimationLibrary(true)}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors w-full max-w-xs"
          >
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-sm text-muted-foreground">
              Click to select animation
            </p>
          </button>
        )}
      </FormField>

      <AudioPickerField
        label="Narration Audio"
        hint="Audio played over the animation; Continue unlocks when it finishes"
        value={config?.audioUrl}
        audioId={config?.audioId}
        onChange={(audioUrl, audioId) => updateConfig({ audioUrl, audioId })}
      />

      <FormField
        label="Loop Animation"
        hint="Replay the animation continuously while the activity is on screen"
      >
        <Checkbox
          checked={loop}
          onChange={(checked) => updateConfig({ loop: checked })}
          label="Loop"
        />
      </FormField>

      <AnimationLibraryModal
        isOpen={showAnimationLibrary}
        onClose={() => setShowAnimationLibrary(false)}
        onSelectAnimation={(url) => {
          updateConfig({ animationUrl: url });
          setShowAnimationLibrary(false);
        }}
        currentAnimation={animationUrl}
      />
    </div>
  );
}
