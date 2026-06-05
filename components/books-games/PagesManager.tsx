"use client";

/**
 * PagesManager
 *
 * Lists a book's pages and wires up create / edit / delete via the
 * book-page hooks. Uses PageEditorDialog for the form.
 */

import * as React from "react";
import { Plus, Trash2, Edit, Volume2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageEditorDialog } from "@/components/books-games/PageEditorDialog";
import {
  useBookPages,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
} from "@/lib/hooks/useBooks";
import type { BookPage, CreatePageRequest } from "@/lib/api/books";

interface PagesManagerProps {
  bookId: string;
}

export function PagesManager({ bookId }: PagesManagerProps) {
  const { data: pages, isLoading } = useBookPages(bookId);
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState<BookPage | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const sortedPages = React.useMemo(
    () => [...(pages ?? [])].sort((a, b) => a.page_number - b.page_number),
    [pages]
  );

  const openCreate = () => {
    setEditingPage(null);
    setDialogOpen(true);
  };

  const openEdit = (page: BookPage) => {
    setEditingPage(page);
    setDialogOpen(true);
  };

  const handleSave = (values: CreatePageRequest) => {
    if (editingPage) {
      updatePage.mutate(
        { bookId, pageId: editingPage.id, data: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createPage.mutate(
        { bookId, data: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  };

  const handleDelete = (page: BookPage) => {
    if (!confirm(`Delete page ${page.page_number}?`)) return;
    setDeletingId(page.id);
    deletePage.mutate(
      { bookId, pageId: page.id },
      { onSettled: () => setDeletingId(null) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Pages ({sortedPages.length})</h3>
          <p className="text-sm text-muted-foreground">
            Add and arrange the pages of this book.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Page
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No pages yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the first page to start building this book.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {/* Thumbnail */}
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                {page.background_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.background_image_url}
                    alt={`Page ${page.page_number}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Page {page.page_number}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
                    {page.layout}
                  </span>
                  {page.audio_url && (
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <p
                  className="truncate text-xs text-muted-foreground"
                  dir="rtl"
                >
                  {page.text || "No text"}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(page)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(page)}
                  disabled={deletingId === page.id}
                >
                  {deletingId === page.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PageEditorDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        page={editingPage}
        defaultPageNumber={sortedPages.length + 1}
        isSaving={createPage.isPending || updatePage.isPending}
        onSave={handleSave}
      />
    </div>
  );
}
