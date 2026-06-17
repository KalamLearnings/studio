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
import { AudioInputField } from "@/components/audio/AudioInputField";
import { AudioEditModal } from "@/components/audio/AudioEditModal";
import { MediaEmptyState } from "@/components/media";
import type { AudioAsset, AudioCategory } from "@/lib/types/audio";
import { toast } from "sonner";
import { AudioHeader, AudioFilters, AudioTable } from "./_components";

export default function AudioPage() {
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
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
    removeAudio,
  } = useAudio();

  const handleCopyUrl = React.useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  }, []);

  const handleEdit = React.useCallback((audio: AudioAsset) => {
    setEditingAudio(audio);
  }, []);

  const handleSaveEdit = React.useCallback(
    async (
      id: string,
      data: {
        displayName?: string;
        category?: AudioCategory;
        tags?: string[];
      }
    ) => {
      try {
        await updateAudio(id, data);
        toast.success("Audio updated");
      } catch {
        toast.error("Failed to update audio");
        throw new Error("Failed to update audio");
      }
    },
    [updateAudio]
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

  const handleUploadSubmit = React.useCallback(
    async (data: Parameters<typeof uploadNewAudio>[0]) => {
      await uploadNewAudio(data);
      toast.success("Audio uploaded successfully");
      setIsUploadDialogOpen(false);
    },
    [uploadNewAudio]
  );

  const hasFilters = !!(searchQuery || selectedCategory);

  return (
    <div className="space-y-6">
      <AudioHeader onUpload={() => setIsUploadDialogOpen(true)} />

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
          onAction={() => setIsUploadDialogOpen(true)}
        />
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Audio</DialogTitle>
          </DialogHeader>
          <AudioInputField mode="library" onSubmit={handleUploadSubmit} />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <AudioEditModal
        audio={editingAudio}
        open={!!editingAudio}
        onOpenChange={(open) => !open && setEditingAudio(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
