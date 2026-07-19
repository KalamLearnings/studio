/**
 * Shop Items Service
 *
 * Direct-table access to `shop_items` and `curriculum_rewards`.
 *
 * Uses the table-backed convention (see audioService/assetService) rather than
 * lib/api/* because the shop edge function exposes no admin routes.
 *
 * All functions throw on error - wrap in try/catch (or let react-query handle it).
 */

import { createClient } from '@/lib/supabase/client';

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
 * A curriculum-completion reward, joined to the item it grants.
 * Mirrors the select shape the runtime uses in
 * kalam-readers-backend/supabase/functions/progress/rewards-repo.ts so the
 * admin UI and the grant path agree.
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

export async function listShopItems(
  category?: ShopItemCategory,
): Promise<ShopItem[]> {
  const supabase = createClient();

  let query = supabase
    .from('shop_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch shop items:', error);
    throw new Error(`Failed to fetch shop items: ${error.message}`);
  }

  return (data ?? []) as ShopItem[];
}

export async function createShopItem(
  data: CreateShopItemRequest,
): Promise<ShopItem> {
  const supabase = createClient();

  const { data: created, error } = await supabase
    .from('shop_items')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Failed to create shop item:', error);
    throw new Error(`Failed to create shop item: ${error.message}`);
  }

  return created as ShopItem;
}

export async function updateShopItem(
  itemId: string,
  data: UpdateShopItemRequest,
): Promise<ShopItem> {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from('shop_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update shop item:', error);
    throw new Error(`Failed to update shop item: ${error.message}`);
  }

  return updated as ShopItem;
}

export async function deleteShopItem(itemId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('shop_items').delete().eq('id', itemId);

  if (error) {
    // curriculum_rewards.item_id is ON DELETE RESTRICT, so this fails loudly
    // when the item is still wired up as a reward - surface that plainly
    // rather than leaving a curriculum with nothing to award.
    console.error('Failed to delete shop item:', error);
    throw new Error(
      error.code === '23503'
        ? 'This item is a curriculum completion reward. Remove it from the curriculum first.'
        : `Failed to delete shop item: ${error.message}`,
    );
  }
}

// ============================================================================
// CURRICULUM REWARDS
// ============================================================================

export async function listCurriculumRewards(
  curriculumId: string,
): Promise<CurriculumReward[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('curriculum_rewards')
    .select(
      `
      id,
      curriculum_id,
      item_id,
      sort_order,
      is_active,
      created_at,
      shop_items (
        id, category, name, name_ar, description, description_ar,
        image_url, preview_url, price, is_premium, sort_order,
        unlocked_by_default, is_active, created_at, updated_at
      )
    `,
    )
    .eq('curriculum_id', curriculumId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch curriculum rewards:', error);
    throw new Error(`Failed to fetch curriculum rewards: ${error.message}`);
  }

  return (data ?? []) as unknown as CurriculumReward[];
}

export async function addCurriculumReward(params: {
  curriculumId: string;
  itemId: string;
  sortOrder?: number;
}): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('curriculum_rewards').insert({
    curriculum_id: params.curriculumId,
    item_id: params.itemId,
    sort_order: params.sortOrder ?? 0,
    is_active: true,
  });

  if (error) {
    console.error('Failed to add curriculum reward:', error);
    throw new Error(
      error.code === '23505'
        ? 'This curriculum already awards that item.'
        : `Failed to add curriculum reward: ${error.message}`,
    );
  }
}

export async function removeCurriculumReward(rewardId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('curriculum_rewards')
    .delete()
    .eq('id', rewardId);

  if (error) {
    console.error('Failed to remove curriculum reward:', error);
    throw new Error(`Failed to remove curriculum reward: ${error.message}`);
  }
}
