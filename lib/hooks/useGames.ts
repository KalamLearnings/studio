/**
 * React Query hooks for game operations
 *
 * Mirrors lib/hooks/useBooks.ts conventions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
  listAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from '@/lib/api/games';
import type {
  Game,
  CreateGameRequest,
  UpdateGameRequest,
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
} from '@/lib/api/games';
import { toast } from 'sonner';

// ============================================================================
// GAME HOOKS
// ============================================================================

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: listGames,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGame(gameId: string | null) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGame(gameId!),
    enabled: !!gameId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGameRequest) => createGame(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create game');
    },
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: string; data: UpdateGameRequest }) =>
      updateGame(gameId, data),
    onSuccess: (updatedGame) => {
      queryClient.setQueryData<Game>(['game', updatedGame.id], updatedGame);
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update game');
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => deleteGame(gameId),
    onSuccess: (_, gameId) => {
      queryClient.removeQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Game deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete game');
    },
  });
}

// ============================================================================
// AVAILABILITY HOOKS
// ============================================================================

export function useGameAvailability(gameId: string | null) {
  return useQuery({
    queryKey: ['game-availability', gameId],
    queryFn: () => listAvailability(gameId!),
    enabled: !!gameId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGameAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: string; data: CreateAvailabilityRequest }) =>
      createAvailability(gameId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['game-availability', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      toast.success('Availability rule created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create availability rule');
    },
  });
}

export function useUpdateGameAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gameId,
      ruleId,
      data,
    }: {
      gameId: string;
      ruleId: string;
      data: UpdateAvailabilityRequest;
    }) => updateAvailability(gameId, ruleId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['game-availability', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      toast.success('Availability rule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update availability rule');
    },
  });
}

export function useDeleteGameAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, ruleId }: { gameId: string; ruleId: string }) =>
      deleteAvailability(gameId, ruleId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['game-availability', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      toast.success('Availability rule deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete availability rule');
    },
  });
}
