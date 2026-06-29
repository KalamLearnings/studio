"use client";

/**
 * AudioInputField Component
 *
 * Unified audio input component used for:
 * 1. Audio Library - adding new audio assets (with category, tags, name). This
 *    is a standalone authoring feature and still generates audio client-side via
 *    the /tts edge function.
 * 2. Activity Forms - instruction field. The BACKEND owns instruction-audio
 *    generation, so this mode NEVER calls /tts or uploads. It surfaces intent
 *    (text, voice, and a "Regenerate audio" flag) up to the form and only plays
 *    the existing clip for preview.
 *
 * Features:
 * - Library mode: Upload File / Generate-from-Text (client TTS), category, tags,
 *   name.
 * - Instruction mode: text + voice picker + a "Regenerate audio" checkbox +
 *   play-existing-clip preview.
 */

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Loader2, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { VoiceTagsInput } from "./VoiceTagsInput";
import { VoiceSelector } from "./VoiceSelector";
import { DEFAULT_VOICE } from "@/lib/constants/voices";
import { resolveAudioUrl } from "@/lib/services/audioService";
import {
  AUDIO_CATEGORIES,
  SUPPORTED_AUDIO_TYPES,
  MAX_AUDIO_FILE_SIZE,
  type AudioCategory,
} from "@/lib/types/audio";
import { toast } from "sonner";

type InputMode = "upload" | "tts";

interface LetterData {
  letter?: string;
  name_arabic?: string;
  name_english?: string;
  letter_sound?: string;
}

interface AudioInputFieldProps {
  // Mode - "library" shows all fields, "instruction" is simplified for activity forms
  mode?: "library" | "instruction";

  // For instruction mode
  value?: string;
  onChange?: (value: string) => void;
  letterData?: LetterData | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;

  // Existing audio (for edit mode or showing current audio)
  existingAudioUrl?: string | null;

  // Callbacks
  onAudioGenerated?: (blob: Blob, blobUrl: string, filePath: string) => void;
  onSubmit?: (data: AudioSubmitData) => Promise<void>;

  // Voice control (can be controlled externally)
  selectedVoice?: string;
  onVoiceChange?: (voiceId: string) => void;

  // Instruction mode only: backend-owned audio regeneration.
  // The form owns this flag; the field auto-checks it when the instruction text
  // or voice changes and lets the creator toggle it manually. Hidden when
  // `showRegenerate` is false (e.g. on create, where the backend always
  // generates and the flag is irrelevant).
  regenerateAudio?: boolean;
  onRegenerateAudioChange?: (value: boolean) => void;
  showRegenerate?: boolean;

  // For library mode
  defaultCategory?: AudioCategory | null;
  editingAudio?: {
    displayName?: string;
    category?: AudioCategory;
    tags?: string[];
    url?: string;
    metadata?: Record<string, unknown>;
  } | null;
}

export interface AudioSubmitData {
  displayName: string;
  category: AudioCategory;
  tags: string[];
  // Undefined when editing an existing asset without regenerating/replacing the
  // clip (metadata-only edit). Always present on create.
  file?: File;
  metadata?: Record<string, unknown>;
}

export function AudioInputField({
  mode = "instruction",
  value = "",
  onChange,
  letterData,
  label = "Instruction (English)",
  placeholder = "Enter instruction for the learner...",
  required = true,
  rows = 3,
  existingAudioUrl: existingAudioUrlProp,
  onAudioGenerated,
  onSubmit,
  selectedVoice: controlledVoice,
  onVoiceChange,
  regenerateAudio = false,
  onRegenerateAudioChange,
  showRegenerate = false,
  defaultCategory,
  editingAudio,
}: AudioInputFieldProps) {
  const isLibraryMode = mode === "library";
  const isEditing = !!editingAudio;

  // Input mode (upload vs TTS)
  const [inputMode, setInputMode] = useState<InputMode>("tts");

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // TTS state
  const [ttsText, setTtsText] = useState(
    (editingAudio?.metadata?.ttsText as string) || value || ""
  );
  const [internalVoice, setInternalVoice] = useState(
    (editingAudio?.metadata?.voiceId as string) || DEFAULT_VOICE.id
  );
  const voice = controlledVoice ?? internalVoice;
  // Changing the voice in instruction mode means the existing clip no longer
  // matches the selected voice, so auto-arm regeneration. Library mode (which
  // generates client-side) just updates the voice.
  const handleVoiceChange = (voiceId: string) => {
    (onVoiceChange ?? setInternalVoice)(voiceId);
    if (!isLibraryMode) onRegenerateAudioChange?.(true);
  };

  // Generated audio state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<{
    blob: Blob;
    blobUrl: string;
  } | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(
    existingAudioUrlProp || editingAudio?.url || null
  );

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);

  // Library mode fields
  const [displayName, setDisplayName] = useState(editingAudio?.displayName || "");
  const [category, setCategory] = useState<AudioCategory | null>(
    editingAudio?.category || defaultCategory || null
  );
  const [tags, setTags] = useState<string[]>(editingAudio?.tags || []);
  const [tagInput, setTagInput] = useState("");

  // Form state
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync ttsText with external value in instruction mode
  useEffect(() => {
    if (!isLibraryMode && value !== ttsText) {
      setTtsText(value);
    }
  }, [value, isLibraryMode]);

  // Instruction mode: adopt the backend's audio_url when the parent updates it
  // (e.g. after a save regenerates the clip) so the play button previews the
  // current clip without a remount. Library mode manages its own audio state.
  useEffect(() => {
    if (!isLibraryMode) {
      setExistingAudioUrl(existingAudioUrlProp ?? null);
    }
  }, [existingAudioUrlProp, isLibraryMode]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (generatedBlob?.blobUrl) {
        URL.revokeObjectURL(generatedBlob.blobUrl);
      }
    };
  }, [generatedBlob]);

  // Handle text change - sync to parent in instruction mode
  const handleTextChange = (newText: string) => {
    setTtsText(newText);
    if (!isLibraryMode) {
      onChange?.(newText);
      // Editing the instruction text means the existing clip is stale, so
      // auto-arm regeneration (backend regenerates on save).
      onRegenerateAudioChange?.(true);
    }
  };

  // Insert placeholder at cursor
  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = ttsText.substring(0, start) + placeholder + ttsText.substring(end);

    handleTextChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  // File handling
  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      if (isLibraryMode) setDisplayName("");
      return;
    }

    if (!SUPPORTED_AUDIO_TYPES.includes(selectedFile.type)) {
      setError("Please select a valid audio file (MP3, WAV, OGG, or M4A)");
      return;
    }

    if (selectedFile.size > MAX_AUDIO_FILE_SIZE) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    setFile(selectedFile);

    if (isLibraryMode) {
      const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");
      setDisplayName(nameWithoutExtension);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setInputMode("upload");
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Tags handling (library mode only)
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Audio playback
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    let audioUrl: string | undefined;
    if (generatedBlob?.blobUrl) {
      audioUrl = generatedBlob.blobUrl;
    } else if (inputMode === "upload" && file) {
      audioUrl = URL.createObjectURL(file);
    } else if (existingAudioUrl) {
      // existingAudioUrl may be a relative storage path (the backend stores
      // instruction audio as `instructions/...mp3`); resolve it to a full
      // Supabase URL so it plays before a page refresh, not just after.
      audioUrl = resolveAudioUrl(existingAudioUrl) ?? undefined;
    }

    if (!audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  // TTS Generation (library mode only).
  //
  // Instruction-mode audio is generated by the BACKEND on save, so this never
  // runs for instructions — the field only previews the existing clip and
  // surfaces the regenerate flag.
  const handleGenerateTTS = async () => {
    if (!isLibraryMode) return;
    if (!ttsText.trim()) {
      setError("Please enter text to generate audio");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const {
        createClient,
        getEnvironmentBaseUrl,
        getEdgeFunctionAuthHeaders,
      } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated. Please log in.");
      }

      const response = await fetch(
        `${getEnvironmentBaseUrl()}/functions/v1/tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getEdgeFunctionAuthHeaders(session.access_token),
          },
          body: JSON.stringify({
            text: ttsText,
            language: "ar",
            voice_id: voice,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio");
      }

      const responseData = await response.json();
      const data = responseData.data || responseData;

      // Convert base64 to blob
      const binaryString = atob(data.audio_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.content_type });
      const blobUrl = URL.createObjectURL(blob);

      // Cleanup old blob
      if (generatedBlob?.blobUrl) {
        URL.revokeObjectURL(generatedBlob.blobUrl);
      }

      setGeneratedBlob({ blob, blobUrl });
      setExistingAudioUrl(null);

      // Auto-set display name in library mode
      if (isLibraryMode && !displayName.trim()) {
        const truncatedText = ttsText.slice(0, 30) + (ttsText.length > 30 ? "..." : "");
        setDisplayName(truncatedText);
      }

      // Notify parent
      onAudioGenerated?.(blob, blobUrl, data.suggested_file_path);

      toast.success("Audio generated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate audio";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Form submission (library mode only)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLibraryMode || !onSubmit) return;

    let uploadFile: File | undefined;

    if (inputMode === "upload" && file) {
      uploadFile = file;
    } else if (inputMode === "tts" && generatedBlob) {
      uploadFile = new File(
        [generatedBlob.blob],
        `${displayName || "tts-audio"}.mp3`,
        { type: "audio/mpeg" }
      );
    } else if (!isEditing) {
      setError(inputMode === "upload" ? "Please select a file" : "Please generate audio first");
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter a name for this audio");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const metadata: Record<string, unknown> = {};
      if (inputMode === "tts" && generatedBlob) {
        metadata.ttsText = ttsText;
        metadata.voiceId = voice;
      }

      await onSubmit({
        displayName: displayName.trim(),
        file: uploadFile,
        category: category,
        tags,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      // Reset form
      setFile(null);
      setDisplayName("");
      setTags([]);
      setTagInput("");
      setTtsText("");
      setGeneratedBlob(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasAudio = isEditing || (inputMode === "upload" ? !!file : !!generatedBlob) || !!existingAudioUrl;

  // Get the ref for VoiceTagsInput's internal textarea
  const voiceTagsRef = useRef<{ textarea: HTMLTextAreaElement | null }>({ textarea: null });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Mode Selector (library mode shows upload option) */}
      {isLibraryMode && (
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all",
              inputMode === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isEditing ? "Replace with File" : "Upload File"}
          </button>
          <button
            type="button"
            onClick={() => setInputMode("tts")}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all",
              inputMode === "tts"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isEditing ? "Regenerate from Text" : "Generate from Text"}
          </button>
        </div>
      )}

      {/* File Upload (library mode, upload tab) */}
      {isLibraryMode && inputMode === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            file && "bg-muted/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,audio/mpeg,audio/wav,audio/ogg,audio/m4a"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />

          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant={isPlaying ? "default" : "outline"}
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause();
                  }}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                <div className="text-left">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileChange(null);
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag & drop an audio file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground/70">
                MP3, WAV, OGG, or M4A (max 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* TTS Input (both modes, or library mode TTS tab) */}
      {(!isLibraryMode || inputMode === "tts") && (
        <div className="space-y-3">
          {/* Label for instruction mode */}
          {!isLibraryMode && (
            <>
              <Label>
                {label} {required && <span className="text-destructive">*</span>}
              </Label>
              <p className="text-xs text-muted-foreground">
                This text will be converted to audio and played when the activity loads
              </p>
            </>
          )}

          {/* Text Input with Voice Tags */}
          <VoiceTagsInput
            value={ttsText}
            onChange={handleTextChange}
            placeholder={isLibraryMode ? "Enter text to generate audio..." : placeholder}
            dir="ltr"
            rows={rows}
          />

          {/* Template Placeholder Buttons (instruction mode with letter data) */}
          {!isLibraryMode && letterData && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Insert:</span>
              <button
                type="button"
                onClick={() => insertPlaceholder("{{letter}}")}
                className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                title={`Letter character: ${letterData.letter}`}
              >
                {"{{letter}}"} ({letterData.letter})
              </button>
              <button
                type="button"
                onClick={() => insertPlaceholder("{{letter_name}}")}
                className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                title={`Letter name: ${letterData.name_arabic || letterData.name_english}`}
              >
                {"{{letter_name}}"} ({letterData.name_arabic || letterData.name_english})
              </button>
              {letterData.letter_sound && (
                <button
                  type="button"
                  onClick={() => insertPlaceholder("{{letter_sound}}")}
                  className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                  title={`Letter sound: ${letterData.letter_sound}`}
                >
                  {"{{letter_sound}}"} ({letterData.letter_sound})
                </button>
              )}
            </div>
          )}

          {/* Voice Selector + (library) Generate / Play */}
          <div className="flex items-center gap-3">
            <VoiceSelector
              value={voice}
              onChange={handleVoiceChange}
              label="Voice"
              className="flex-1"
            />

            {/* Generate button: library mode only (backend owns instruction audio). */}
            {isLibraryMode && (
              <Button
                type="button"
                variant="default"
                onClick={handleGenerateTTS}
                disabled={!ttsText.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    {hasAudio ? "Regenerate" : "Generate"} Audio
                  </>
                )}
              </Button>
            )}

            {/* Play: previews the existing/just-generated clip in both modes. */}
            {hasAudio && (
              <Button
                type="button"
                variant="outline"
                size={isLibraryMode ? "icon" : "sm"}
                onClick={handlePlayPause}
                className={cn(
                  !isLibraryMode && (
                    isPlaying
                      ? "text-green-900 bg-green-100 border-green-400"
                      : "text-green-700 border-green-300 hover:bg-green-50"
                  )
                )}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    {!isLibraryMode && <span className="ml-1.5">Stop</span>}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    {!isLibraryMode && <span className="ml-1.5">Play</span>}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Regenerate-audio checkbox: instruction mode, edit only. The backend
              regenerates instruction audio on save when this is checked; it
              auto-checks when the text or voice changes and can be toggled
              manually to force or skip a fresh clip. */}
          {!isLibraryMode && showRegenerate && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={regenerateAudio}
                onCheckedChange={(checked) =>
                  onRegenerateAudioChange?.(checked === true)
                }
              />
              Regenerate audio on save
            </label>
          )}
        </div>
      )}

      {/* Library mode additional fields */}
      {isLibraryMode && (
        <>
          {/* Audio Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter a name for this audio"
              required
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(AUDIO_CATEGORIES).map(([key, { label, description }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key as AudioCategory)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-all",
                    category === key
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                  title={description}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Enter a tag"
                className="flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-sm text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-primary/70 hover:text-primary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit Button (library mode only) */}
      {isLibraryMode && (
        <Button
          type="submit"
          disabled={!hasAudio || uploading}
          className="w-full"
        >
          {uploading ? "Saving..." : isEditing ? "Save Changes" : "Add Audio"}
        </Button>
      )}
    </form>
  );
}
