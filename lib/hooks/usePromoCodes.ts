/**
 * React Query hooks for promo code operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getPromoCodeRedemptions,
} from '@/lib/api/promoCodes';
import type {
  PromoCode,
  CreatePromoCode,
  UpdatePromoCode,
  PromoRedemption,
} from '@/lib/api/promoCodes';
import { toast } from 'sonner';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all promo codes
 */
export function usePromoCodes() {
  return useQuery({
    queryKey: ['promoCodes'],
    queryFn: listPromoCodes,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch redemptions for a specific promo code
 */
export function usePromoCodeRedemptions(promoCodeId: string | null) {
  return useQuery({
    queryKey: ['promoCodeRedemptions', promoCodeId],
    queryFn: () => getPromoCodeRedemptions(promoCodeId!),
    enabled: !!promoCodeId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new promo code
 */
export function useCreatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePromoCode) => createPromoCode(data),
    onSuccess: (newPromoCode) => {
      queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
      toast.success(`Promo code "${newPromoCode.code}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create promo code');
    },
  });
}

/**
 * Update an existing promo code
 */
export function useUpdatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromoCode }) =>
      updatePromoCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
      toast.success('Promo code updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update promo code');
    },
  });
}

/**
 * Delete a promo code
 */
export function useDeletePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePromoCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promoCodes'] });
      toast.success('Promo code deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete promo code');
    },
  });
}
