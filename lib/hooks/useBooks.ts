/**
 * React Query hooks for book operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  listPages,
  createPage,
  updatePage,
  deletePage,
  reorderPages,
  listAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from '@/lib/api/books';
import type {
  Book,
  BookPage,
  BookAvailability,
  CreateBookRequest,
  UpdateBookRequest,
  CreatePageRequest,
  UpdatePageRequest,
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
} from '@/lib/api/books';
import { toast } from 'sonner';

// ============================================================================
// BOOK HOOKS
// ============================================================================

export function useBooks() {
  return useQuery({
    queryKey: ['books'],
    queryFn: listBooks,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBook(bookId: string | null) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBook(bookId!),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookRequest) => createBook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Book created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create book');
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: UpdateBookRequest }) =>
      updateBook(bookId, data),
    onSuccess: (updatedBook) => {
      queryClient.setQueryData<Book>(['book', updatedBook.id], updatedBook);
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Book updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update book');
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: string) => deleteBook(bookId),
    onSuccess: (_, bookId) => {
      queryClient.removeQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success('Book deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete book');
    },
  });
}

// ============================================================================
// PAGE HOOKS
// ============================================================================

export function useBookPages(bookId: string | null) {
  return useQuery({
    queryKey: ['book-pages', bookId],
    queryFn: () => listPages(bookId!),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: CreatePageRequest }) =>
      createPage(bookId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-pages', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      toast.success('Page created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create page');
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      pageId,
      data,
    }: {
      bookId: string;
      pageId: string;
      data: UpdatePageRequest;
    }) => updatePage(bookId, pageId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-pages', bookId] });
      toast.success('Page updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update page');
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, pageId }: { bookId: string; pageId: string }) =>
      deletePage(bookId, pageId),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-pages', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      toast.success('Page deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete page');
    },
  });
}

export function useReorderPages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      pages,
    }: {
      bookId: string;
      pages: Array<{ id: string; page_number: number }>;
    }) => reorderPages(bookId, pages),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-pages', bookId] });
      toast.success('Pages reordered successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder pages');
    },
  });
}

// ============================================================================
// AVAILABILITY HOOKS
// ============================================================================

export function useBookAvailability(bookId: string | null) {
  return useQuery({
    queryKey: ['book-availability', bookId],
    queryFn: () => listAvailability(bookId!),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }: { bookId: string; data: CreateAvailabilityRequest }) =>
      createAvailability(bookId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-availability', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      toast.success('Availability rule created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create availability rule');
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      ruleId,
      data,
    }: {
      bookId: string;
      ruleId: string;
      data: UpdateAvailabilityRequest;
    }) => updateAvailability(bookId, ruleId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-availability', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      toast.success('Availability rule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update availability rule');
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, ruleId }: { bookId: string; ruleId: string }) =>
      deleteAvailability(bookId, ruleId),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: ['book-availability', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      toast.success('Availability rule deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete availability rule');
    },
  });
}
