/**
 * API Client for Shop Items and Curriculum Completion Rewards
 * All functions throw on error - wrap in try/catch
 *
 * These go through the shop edge function's admin routes rather than hitting
 * the tables directly: shop_items and curriculum_rewards are RLS SELECT-only
 * for authenticated clients, and the routes additionally gate on requireAdmin
 * so an ordinary parent account cannot mint shop content.
 */

import { fetchWithAuth } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type ShopItemCategory =
  | 'avatar'
  | 'hat'
  | 'background'
  | 'sticker'
  | 'book'
  | 'game';

export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  image_url: string;
  preview_url: string | null;
  price: number;
  is_premium: boolean;
  sort_order: number;
  unlocked_by_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShopItemRequest {
  category: ShopItemCategory;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  image_url: string;
  preview_url?: string | null;
  price?: number;
  is_premium?: boolean;
  sort_order?: number;
  unlocked_by_default?: boolean;
  is_active?: boolean;
}

export type UpdateShopItemRequest = Partial<CreateShopItemRequest>;

/**
 * A curriculum-completion reward joined to the item it grants.
 * Mirrors the runtime grant query in
 * kalam-readers-backend/supabase/functions/progress/rewards-repo.ts.
 */
export interface CurriculumReward {
  id: string;
  curriculum_id: string;
  item_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  shop_items: ShopItem | null;
}

// ============================================================================
// SHOP ITEMS
// ============================================================================

export async function listShopItems(category?: ShopItemCategory): Promise<ShopItem[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return fetchWithAuth<ShopItem[]>(`/shop/admin/items${query}`);
}

export async function createShopItem(data: CreateShopItemRequest): Promise<ShopItem> {
  return fetchWithAuth<ShopItem>('/shop/admin/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateShopItem(
  itemId: string,
  data: UpdateShopItemRequest
): Promise<ShopItem> {
  return fetchWithAuth<ShopItem>(`/shop/admin/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteShopItem(itemId: string): Promise<void> {
  return fetchWithAuth<void>(`/shop/admin/items/${itemId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// CURRICULUM REWARDS
// ============================================================================

export async function listCurriculumRewards(
  curriculumId: string
): Promise<CurriculumReward[]> {
  return fetchWithAuth<CurriculumReward[]>(
    `/shop/admin/curricula/${curriculumId}/rewards`
  );
}

export async function addCurriculumReward(params: {
  curriculumId: string;
  itemId: string;
  sortOrder?: number;
}): Promise<void> {
  return fetchWithAuth<void>(
    `/shop/admin/curricula/${params.curriculumId}/rewards`,
    {
      method: 'POST',
      body: JSON.stringify({
        item_id: params.itemId,
        sort_order: params.sortOrder ?? 0,
      }),
    }
  );
}

export async function removeCurriculumReward(rewardId: string): Promise<void> {
  return fetchWithAuth<void>(`/shop/admin/rewards/${rewardId}`, {
    method: 'DELETE',
  });
}
