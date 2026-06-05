"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, MoreVertical, BookOpen, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  useCurricula,
  useCreateCurriculum,
  useDeleteCurriculum,
} from "@/lib/hooks/useCurriculum";
import type { Curriculum } from "@/lib/schemas/curriculum";

const CurriculumCard = React.memo(function CurriculumCard({
  curriculum,
  onDelete,
}: {
  curriculum: Curriculum;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-tight">
              <Link
                href={`/curricula/${curriculum.id}/builder`}
                className="hover:underline"
              >
                {curriculum.title?.en || "Untitled"}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {curriculum.title?.en || "Untitled Curriculum"}
            </CardDescription>
          </div>
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
              <DropdownMenuItem asChild>
                <Link href={`/curricula/${curriculum.id}/builder`}>
                  Open Builder
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(curriculum.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>Curriculum</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {curriculum.updated_at
                ? new Date(curriculum.updated_at).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              curriculum.is_published
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {curriculum.is_published ? "published" : "draft"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

export default function CurriculaPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  const { data: curricula, isLoading, error } = useCurricula();
  const createMutation = useCreateCurriculum();
  const deleteMutation = useDeleteCurriculum();

  const filteredCurricula = React.useMemo(() => {
    if (!curricula) return [];
    if (!searchQuery) return curricula;

    const query = searchQuery.toLowerCase();
    return curricula.filter(
      (c) =>
        c.title?.en?.toLowerCase().includes(query) ||
        c.title?.ar?.includes(searchQuery)
    );
  }, [curricula, searchQuery]);

  const handleCreate = React.useCallback(async () => {
    if (!newTitle.trim()) return;

    await createMutation.mutateAsync({
      title: { en: newTitle, ar: "" },
    });

    setIsCreateDialogOpen(false);
    setNewTitle("");
  }, [newTitle, createMutation]);

  const handleDelete = React.useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this curriculum?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load curricula</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Curricula</h1>
          <p className="text-muted-foreground">
            Manage your Arabic learning curricula
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Curriculum
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search curricula..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Curricula Grid */}
      {!isLoading && filteredCurricula.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCurricula.map((curriculum) => (
            <CurriculumCard
              key={curriculum.id}
              curriculum={curriculum}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCurricula.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No curricula found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Get started by creating your first curriculum"}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Curriculum
            </Button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Curriculum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Arabic Letters - Beginner"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
