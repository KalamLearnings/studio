"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { useBooks, useDeleteBook, useUpdateBook } from "@/lib/hooks/useBooks";
import { MediaEmptyState } from "@/components/media";
import type { Book } from "@/lib/api/books";
import { BooksHeader, BooksSearch, BooksGrid } from "./_components";

export default function BooksPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: books, isLoading, error } = useBooks();
  const deleteMutation = useDeleteBook();
  const updateMutation = useUpdateBook();

  const filteredBooks = React.useMemo(() => {
    if (!books) return [];
    if (!searchQuery) return books;

    const query = searchQuery.toLowerCase();
    return books.filter(
      (book) =>
        book.title?.toLowerCase().includes(query) ||
        book.title_ar?.includes(searchQuery) ||
        book.synopsis?.toLowerCase().includes(query)
    );
  }, [books, searchQuery]);

  const handleCreateBook = React.useCallback(() => {
    router.push("/books/new");
  }, [router]);

  const handleEdit = React.useCallback(
    (id: string) => router.push(`/books/${id}`),
    [router]
  );

  const handleDelete = React.useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this book?")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  const handleToggleActive = React.useCallback(
    (book: Book) => {
      updateMutation.mutate({
        bookId: book.id,
        data: { is_active: !book.is_active },
      });
    },
    [updateMutation]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-12 text-center">
        <p className="text-destructive">Failed to load books</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BooksHeader onCreateBook={handleCreateBook} />

      <BooksSearch value={searchQuery} onChange={setSearchQuery} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Books Grid */}
      {!isLoading && filteredBooks.length > 0 && (
        <BooksGrid
          books={filteredBooks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Empty State */}
      {!isLoading && filteredBooks.length === 0 && (
        <MediaEmptyState
          icon={BookOpen}
          title="No books found"
          description="Create your first reading book"
          hasFilters={!!searchQuery}
          filterMessage="Try a different search term"
          actionLabel="Create Book"
          onAction={handleCreateBook}
        />
      )}
    </div>
  );
}
