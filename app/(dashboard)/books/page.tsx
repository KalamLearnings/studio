"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  BookOpen,
  Loader2,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useBooks, useDeleteBook, useUpdateBook } from "@/lib/hooks/useBooks";
import type { Book } from "@/lib/api/books";

const levelColors: Record<number, string> = {
  1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  3: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const levelLabels: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

const coverColors = [
  "bg-amber-500",
  "bg-indigo-500",
  "bg-green-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-blue-500",
  "bg-teal-500",
];

const BookCard = React.memo(function BookCard({
  book,
  colorIndex,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  book: Book;
  colorIndex: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (book: Book) => void;
}) {
  const coverColor = coverColors[colorIndex % coverColors.length];

  return (
    <Card className="group overflow-hidden">
      {/* Book Cover */}
      <div
        className={`relative h-40 cursor-pointer ${book.image_url ? "" : coverColor}`}
        onClick={() => onEdit(book.id)}
      >
        {book.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.image_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <BookOpen className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2 font-arabic text-xl" dir="rtl">
                {book.title_ar || book.title}
              </p>
            </div>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(book.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(book.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{book.title}</CardTitle>
          <Switch
            checked={book.is_active}
            onCheckedChange={() => onToggleActive(book)}
            aria-label="Toggle active"
          />
        </div>
        <CardDescription className="line-clamp-2">
          {book.synopsis || "No description"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {book.page_count || 0} pages
          </span>
          {book.difficulty_level && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                levelColors[book.difficulty_level] || levelColors[1]
              }`}
            >
              {levelLabels[book.difficulty_level] || "Beginner"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Books</h1>
          <p className="text-muted-foreground">
            Create and manage reading books for learners
          </p>
        </div>
        <Button onClick={() => router.push("/books/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Book
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search books..."
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

      {/* Books Grid */}
      {!isLoading && filteredBooks.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              colorIndex={index}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No books found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Create your first reading book"}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => router.push("/books/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Book
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
