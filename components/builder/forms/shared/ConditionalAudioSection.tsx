"use client";

/**
 * Conditional Audio Responses — shared, optional section on every activity form.
 *
 * Lets authors attach result-based audio (success / partial / wrong attempts /
 * completion) that the mobile player triggers based on the learner's outcome.
 *
 * UX: ONE composer — pick a condition, type the text (the same VoiceTagsInput
 * used by the instruction field), Generate — and it's added to a list of saved
 * responses below. One response per condition (re-adding a condition edits it).
 * Stored at config.conditionalAudio.<slot>; mobile reads the same shape.
 *
 * Simplified from the v1 dashboard: predefined result slots only — v1's custom
 * "rules[]" condition builder is dropped, but any existing rules[] in saved data
 * are preserved untouched on save.
 */

import * as React from "react";
import { MessageSquareText, Plus, Play, Pause, Pencil, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceTagsInput } from "@/components/audio/VoiceTagsInput";
import { VoiceSelector } from "@/components/audio/VoiceSelector";
import { DEFAULT_VOICE } from "@/lib/constants/voices";
import { generateConditionalAudio } from "@/lib/services/audioService";
import type {
  AudioResponse,
  ConditionalAudioConfig,
} from "@kalam/curriculum-schemas";
import { toast } from "sonner";

type SlotKey = keyof Pick<
  ConditionalAudioConfig,
  | "onSuccess"
  | "onPartialSuccess"
  | "onFirstWrongAttempt"
  | "onSecondWrongAttempt"
  | "onThirdWrongAttempt"
  | "onCompletion"
>;

const SLOTS: { key: SlotKey; label: string; icon: string }[] = [
  { key: "onSuccess", label: "On Success", icon: "✅" },
  { key: "onPartialSuccess", label: "On Partial Success", icon: "🟡" },
  { key: "onFirstWrongAttempt", label: "1st Wrong Attempt", icon: "1️⃣" },
  { key: "onSecondWrongAttempt", label: "2nd Wrong Attempt", icon: "2️⃣" },
  { key: "onThirdWrongAttempt", label: "3rd Wrong Attempt", icon: "3️⃣" },
  { key: "onCompletion", label: "On Completion", icon: "🏁" },
];

const SLOT_META = (key: SlotKey) => SLOTS.find((s) => s.key === key)!;

interface ConditionalAudioSectionProps {
  value?: ConditionalAudioConfig;
  onChange: (value: ConditionalAudioConfig) => void;
  /** Default TTS voice from the activity form. */
  voiceId?: string;
}

export function ConditionalAudioSection({
  value,
  onChange,
  voiceId,
}: ConditionalAudioSectionProps) {
  const config = value ?? {};

  // Composer state.
  const [condition, setCondition] = React.useState<SlotKey>("onSuccess");
  const [text, setText] = React.useState("");
  const [voice, setVoice] = React.useState(voiceId || DEFAULT_VOICE.id);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Single shared <audio> for previewing list rows.
  const [playingKey, setPlayingKey] = React.useState<SlotKey | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const savedSlots = SLOTS.filter((s) => config[s.key]?.text);
  const isEditingExisting = !!config[condition]?.text;

  const setSlot = (key: SlotKey, slot: AudioResponse | undefined) => {
    // Preserve other slots AND any existing rules[] (not edited here).
    const next: ConditionalAudioConfig = { ...config };
    if (slot) next[key] = slot;
    else delete next[key];
    onChange(next);
  };

  const resetComposer = () => {
    setText("");
    setVoice(voiceId || DEFAULT_VOICE.id);
  };

  const handleAdd = async () => {
    if (!text.trim()) {
      toast.error("Enter text first");
      return;
    }
    setIsGenerating(true);
    try {
      const url = await generateConditionalAudio(text.trim(), voice);
      setSlot(condition, {
        ...(config[condition] ?? {}),
        text: text.trim(),
        audio_url: url,
        voice_id: voice,
      });
      toast.success(`${SLOT_META(condition).label} response saved`);
      resetComposer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (key: SlotKey) => {
    const slot = config[key];
    if (!slot) return;
    setCondition(key);
    setText(slot.text ?? "");
    setVoice(slot.voice_id || voiceId || DEFAULT_VOICE.id);
  };

  const handleRemove = (key: SlotKey) => {
    setSlot(key, undefined);
    if (playingKey === key) {
      audioRef.current?.pause();
      setPlayingKey(null);
    }
  };

  const handleTogglePlay = (key: SlotKey) => {
    const url = config[key]?.audio_url;
    if (!url) return;
    if (playingKey === key) {
      audioRef.current?.pause();
      setPlayingKey(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = new Audio(url);
    audioRef.current.onended = () => setPlayingKey(null);
    audioRef.current.play().catch(() => setPlayingKey(null));
    setPlayingKey(key);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Conditional Audio Responses</span>
        <span className="text-xs text-muted-foreground">(optional)</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Add audio that plays based on the learner&apos;s result. Pick a moment,
        write what should be said, and generate.
      </p>

      {/* Composer */}
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Select value={condition} onValueChange={(v) => setCondition(v as SlotKey)}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOTS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.icon} {s.label}
                  {config[s.key]?.text ? " · set" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <VoiceSelector value={voice} onChange={setVoice} label="" />
        </div>

        <VoiceTagsInput
          value={text}
          onChange={setText}
          dir="auto"
          rows={2}
          placeholder="What should play here? (e.g. Great job!)"
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={!text.trim() || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : isEditingExisting ? (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isEditingExisting ? "Update response" : "Add response"}
          </Button>
          {text && (
            <Button type="button" size="sm" variant="ghost" onClick={resetComposer}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Saved responses */}
      {savedSlots.length > 0 && (
        <div className="space-y-1.5">
          {savedSlots.map((s) => {
            const slot = config[s.key]!;
            return (
              <div
                key={s.key}
                className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
              >
                <span className="text-base">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-none">{s.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="auto">
                    {slot.text}
                  </p>
                </div>
                {slot.audio_url && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleTogglePlay(s.key)}
                  >
                    {playingKey === s.key ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handleEdit(s.key)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(s.key)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
