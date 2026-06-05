"use client";

/**
 * PageEditorDialog
 *
 * Create/edit a single book page: page number, layout, background image,
 * Arabic text, and narration audio (generate via TTS, pick from library,
 * preview, or clear).
 */

import * as React from "react";
import { Loader2, Play, Sparkles, Library, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoverImageField } from "@/components/books-games/CoverImageField";
import { VoiceSelector } from "@/components/audio/VoiceSelector";
import { VoiceTagsInput } from "@/components/audio/VoiceTagsInput";
import { AudioPicker } from "@/components/audio/AudioPicker";
import { useTtsUpload } from "@/lib/hooks/useTtsUpload";
import { DEFAULT_VOICE } from "@/lib/constants/voices";
import type { BookPage, CreatePageRequest } from "@/lib/api/books";

export interface PageFormValues {
  page_number: number;
  layout: "single" | "split";
  background_image_url: string;
  text: string;
  audio_url: string;
}

interface PageEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The page being edited, or null when creating. */
  page: BookPage | null;
  /** Default page number for new pages. */
  defaultPageNumber: number;
  isSaving?: boolean;
  onSave: (values: CreatePageRequest) => void;
}

export function PageEditorDialog({
  isOpen,
  onClose,
  page,
  defaultPageNumber,
  isSaving = false,
  onSave,
}: PageEditorDialogProps) {
  const [values, setValues] = React.useState<PageFormValues>({
    page_number: defaultPageNumber,
    layout: "single",
    background_image_url: "",
    text: "",
    audio_url: "",
  });
  const [voiceId, setVoiceId] = React.useState(DEFAULT_VOICE.id);
  const [audioPickerOpen, setAudioPickerOpen] = React.useState(false);

  const { isGenerating, generateAndUpload } = useTtsUpload();

  // Reset the form whenever the dialog opens.
  React.useEffect(() => {
    if (!isOpen) return;
    if (page) {
      setValues({
        page_number: page.page_number,
        layout: page.layout,
        background_image_url: page.background_image_url,
        text: page.text,
        audio_url: page.audio_url ?? "",
      });
    } else {
      setValues({
        page_number: defaultPageNumber,
        layout: "single",
        background_image_url: "",
        text: "",
        audio_url: "",
      });
    }
    setVoiceId(DEFAULT_VOICE.id);
  }, [isOpen, page, defaultPageNumber]);

  const update = <K extends keyof PageFormValues>(
    key: K,
    value: PageFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    const url = await generateAndUpload({ text: values.text, voiceId });
    if (url) update("audio_url", url);
  };

  const handlePreview = () => {
    if (values.audio_url) {
      new Audio(values.audio_url).play().catch(() => {});
    }
  };

  const handleSubmit = () => {
    onSave({
      page_number: values.page_number,
      layout: values.layout,
      background_image_url: values.background_image_url,
      text: values.text,
      audio_url: values.audio_url || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{page ? "Edit Page" : "Add Page"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="page_number">Page Number</Label>
              <Input
                id="page_number"
                type="number"
                min={1}
                value={values.page_number}
                onChange={(e) =>
                  update("page_number", Number(e.target.value) || 1)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select
                value={values.layout}
                onValueChange={(v) => update("layout", v as "single" | "split")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <CoverImageField
            value={values.background_image_url}
            onChange={(url) => update("background_image_url", url)}
            label="Background Image"
            aspectClassName="aspect-[4/5]"
          />

          <div className="space-y-2">
            <Label>Page Text (Arabic)</Label>
            <VoiceTagsInput
              value={values.text}
              onChange={(v) => update("text", v)}
              placeholder="Enter the page text..."
              dir="rtl"
              rows={3}
            />
          </div>

          {/* Audio */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label>Page Audio</Label>

            {values.audio_url ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Play
                </Button>
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  Audio attached
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => update("audio_url", "")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No audio yet. Generate from the page text or pick from the
                library.
              </p>
            )}

            <VoiceSelector value={voiceId} onChange={setVoiceId} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || !values.text.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                Generate Audio
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAudioPickerOpen(true)}
              >
                <Library className="mr-1.5 h-3.5 w-3.5" />
                From Library
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !values.background_image_url || !values.text.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : page ? (
              "Save Page"
            ) : (
              "Add Page"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AudioPicker
        isOpen={audioPickerOpen}
        onClose={() => setAudioPickerOpen(false)}
        onSelect={(url) => update("audio_url", url)}
        currentUrl={values.audio_url}
      />
    </Dialog>
  );
}
