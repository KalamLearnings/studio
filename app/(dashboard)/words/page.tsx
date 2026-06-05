"use client";

import * as React from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Volume2,
  Type,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useWords, type Word } from "@/lib/hooks/useWords";
import { toast } from "sonner";

const WordCard = React.memo(function WordCard({
  word,
  onEdit,
}: {
  word: Word;
  onEdit: (word: Word) => void;
}) {
  const handlePlayAudio = React.useCallback(() => {
    if (word.audio_path) {
      const audio = new Audio(word.audio_path);
      audio.play().catch(() => toast.error("Failed to play audio"));
    }
  }, [word.audio_path]);

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-arabic text-2xl" dir="rtl">
              {word.arabic}
            </p>
            <p className="font-medium">{word.english || "No translation"}</p>
            <p className="text-sm text-muted-foreground">
              {word.transliteration || ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {word.has_audio && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePlayAudio}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(word)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Volume2 className="mr-2 h-4 w-4" />
                  {word.has_audio ? "Update Audio" : "Add Audio"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {word.category && (
          <div className="mt-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {word.category}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default function WordsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingWord, setEditingWord] = React.useState<Word | null>(null);

  const {
    words,
    loading,
    error,
    searchQuery,
    setSearchQuery,
  } = useWords();

  const groupedWords = React.useMemo(() => {
    return words.reduce(
      (acc, word) => {
        const category = word.category || "uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(word);
        return acc;
      },
      {} as Record<string, Word[]>
    );
  }, [words]);

  const handleEdit = React.useCallback((word: Word) => {
    setEditingWord(word);
    setIsAddDialogOpen(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setIsAddDialogOpen(false);
    setEditingWord(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Words</h1>
          <p className="text-muted-foreground">
            Manage vocabulary words and translations
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Word
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search words in Arabic, English, or transliteration..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

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

      {/* Words by Category */}
      {!loading &&
        Object.entries(groupedWords).map(([category, categoryWords]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {category} ({categoryWords.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categoryWords.map((word) => (
                <WordCard key={word.id} word={word} onEdit={handleEdit} />
              ))}
            </div>
          </div>
        ))}

      {/* Empty State */}
      {!loading && words.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Type className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No words found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Add your first vocabulary word"}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Word
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Word Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWord ? "Edit Word" : "Add New Word"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="arabic">Arabic</Label>
              <Input
                id="arabic"
                placeholder="Enter Arabic word"
                dir="rtl"
                className="font-arabic text-lg"
                defaultValue={editingWord?.arabic || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="english">English</Label>
              <Input
                id="english"
                placeholder="Enter English translation"
                defaultValue={editingWord?.english || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transliteration">Transliteration</Label>
              <Input
                id="transliteration"
                placeholder="Enter transliteration"
                defaultValue={editingWord?.transliteration || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., food, animals, colors"
                defaultValue={editingWord?.category || ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleCloseDialog}>
              {editingWord ? "Save Changes" : "Add Word"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
