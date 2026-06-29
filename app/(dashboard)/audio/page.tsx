"use client";

import * as React from "react";
import { Volume2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAudio } from "@/lib/hooks/useAudio";
import {
  AudioInputField,
  type AudioSubmitData,
} from "@/components/audio/AudioInputField";
import { MediaEmptyState } from "@/components/media";
import type { AudioAsset } from "@/lib/types/audio";
import { toast } from "sonner";
import { AudioHeader, AudioFilters, AudioTable } from "./_components";

export default function AudioPage() {
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  // The audio form dialog is shared between "add new" and "edit". `editingAudio`
  // distinguishes the two: null = create, a row = edit.
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAudio, setEditingAudio] = React.useState<AudioAsset | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const {
    audioAssets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    setCategory,
    setSearchQuery,
    uploadNewAudio,
    updateAudio,
    replaceAudioFile,
    removeAudio,
  } = useAudio();

  const handleCopyUrl = React.useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  }, []);

  const handleAddNew = React.useCallback(() => {
    setEditingAudio(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = React.useCallback((audio: AudioAsset) => {
    setEditingAudio(audio);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = React.useCallback(() => {
    setIsDialogOpen(false);
    setEditingAudio(null);
  }, []);

  // Single submit path for the shared add/edit dialog.
  // - Create (no editingAudio): upload a brand-new asset.
  // - Edit with a file (regenerated/replaced): overwrite the file in place so
  //   activities referencing its URL serve the new audio.
  // - Edit without a file: only metadata changed.
  const handleDialogSubmit = React.useCallback(
    async (data: AudioSubmitData) => {
      try {
        if (!editingAudio) {
          // Create requires a file (the component enforces generate/upload
          // before submit when not editing).
          if (!data.file) {
            toast.error("Please generate or upload audio first");
            throw new Error("Missing audio file");
          }
          await uploadNewAudio({
            displayName: data.displayName,
            category: data.category,
            tags: data.tags,
            file: data.file,
            metadata: data.metadata,
          });
          toast.success("Audio uploaded successfully");
        } else if (data.file) {
          await replaceAudioFile(editingAudio.id, {
            file: data.file,
            displayName: data.displayName,
            category: data.category,
            tags: data.tags,
            metadata: data.metadata,
          });
          toast.success("Audio regenerated and saved");
        } else {
          await updateAudio(editingAudio.id, {
            displayName: data.displayName,
            tags: data.tags,
            ...(data.metadata ? { metadata: data.metadata } : {}),
          });
          toast.success("Audio updated");
        }
        closeDialog();
      } catch {
        toast.error("Failed to save audio");
        throw new Error("Failed to save audio");
      }
    },
    [editingAudio, uploadNewAudio, replaceAudioFile, updateAudio, closeDialog]
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this audio file?")) return;
      try {
        await removeAudio(id);
        toast.success("Audio deleted");
      } catch {
        toast.error("Failed to delete audio");
      }
    },
    [removeAudio]
  );

  const handleTogglePlay = React.useCallback(
    (id: string) => {
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      } else {
        const audio = audioAssets.find((a) => a.id === id);
        if (audio?.url) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          audioRef.current = new Audio(audio.url);
          audioRef.current.play().catch(() => {
            toast.error("Failed to play audio");
          });
          audioRef.current.onended = () => setPlayingId(null);
          setPlayingId(id);
        }
      }
    },
    [playingId, audioAssets]
  );

  const hasFilters = !!(searchQuery || selectedCategory);

  return (
    <div className="space-y-6">
      <AudioHeader onUpload={handleAddNew} />

      <AudioFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setCategory}
      />

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 p-4 text-center text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Audio List */}
      {!loading && audioAssets.length > 0 && (
        <AudioTable
          audioAssets={audioAssets}
          playingId={playingId}
          onTogglePlay={handleTogglePlay}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCopyUrl={handleCopyUrl}
        />
      )}

      {/* Empty State */}
      {!loading && audioAssets.length === 0 && (
        <MediaEmptyState
          icon={Volume2}
          title="No audio files found"
          description="Generate or upload audio files to get started"
          hasFilters={hasFilters}
          actionLabel="Add New Audio"
          onAction={handleAddNew}
        />
      )}

      {/* Add / Edit Dialog — same form for both; editingAudio drives edit mode */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAudio ? "Edit Audio" : "Add New Audio"}</DialogTitle>
          </DialogHeader>
          <AudioInputField
            key={editingAudio?.id ?? "new"}
            mode="library"
            editingAudio={
              editingAudio
                ? {
                    displayName: editingAudio.displayName || editingAudio.name,
                    category: editingAudio.category,
                    tags: editingAudio.tags,
                    url: editingAudio.url,
                    metadata: editingAudio.metadata,
                  }
                : undefined
            }
            onSubmit={handleDialogSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
