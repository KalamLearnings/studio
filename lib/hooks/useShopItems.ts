/**
 * Shop item + curriculum reward hooks
 *
 * Mirrors lib/hooks/useBooks.ts conventions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listShopItems,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  listCurriculumRewards,
  addCurriculumReward,
  removeCurriculumReward,
  type ShopItem,
  type ShopItemCategory,
  type CreateShopItemRequest,
  type UpdateShopItemRequest,
} from '@/lib/api/shopItems';

const STALE_TIME = 5 * 60 * 1000;

// ============================================================================
// SHOP ITEMS
// ============================================================================

export function useShopItems(category?: ShopItemCategory) {
  return useQuery({
    queryKey: ['shop-items', category ?? 'all'],
    queryFn: () => listShopItems(category),
    staleTime: STALE_TIME,
  });
}

export function useCreateShopItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShopItemRequest) => createShopItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      toast.success('Item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create item');
    },
  });
}

export function useUpdateShopItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateShopItemRequest }) =>
      updateShopItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      toast.success('Item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });
}

export function useDeleteShopItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteShopItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-items'] });
      toast.success('Item deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });
}

// ============================================================================
// CURRICULUM REWARDS
// ============================================================================

export function useCurriculumRewards(curriculumId: string | null) {
  return useQuery({
    queryKey: ['curriculum-rewards', curriculumId],
    queryFn: () => listCurriculumRewards(curriculumId!),
    enabled: !!curriculumId,
    staleTime: STALE_TIME,
  });
}

export function useAddCurriculumReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { curriculumId: string; itemId: string; sortOrder?: number }) =>
      addCurriculumReward(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['curriculum-rewards', variables.curriculumId],
      });
      toast.success('Reward added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add reward');
    },
  });
}

export function useRemoveCurriculumReward(curriculumId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) => removeCurriculumReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-rewards', curriculumId] });
      toast.success('Reward removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove reward');
    },
  });
}

export type { ShopItem, ShopItemCategory };
