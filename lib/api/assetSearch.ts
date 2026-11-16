/**
 * `GET /assets?media=&status=a,b&q=&limit=&cursor=` (B-5), staff only: the
 * picture picker's list, newest first, one page at a time.
 */

import { fetchWithAuth } from './client';
import type { AssetMedia, AssetStatus, RegistryAsset } from '@/lib/types/assetRegistry';

export interface AssetSearchQuery {
  media?: AssetMedia;
  status?: readonly AssetStatus[];
  q?: string;
  limit?: number;
  cursor?: string | null;
}

export interface AssetSearchPage {
  items: RegistryAsset[];
  next_cursor: string | null;
}

export function searchAssets(query: AssetSearchQuery): Promise<AssetSearchPage> {
  const p = new URLSearchParams();
  if (query.media) p.set('media', query.media);
  if (query.status?.length) p.set('status', query.status.join(','));
  if (query.q?.trim()) p.set('q', query.q.trim().slice(0, 100));
  if (query.limit) p.set('limit', String(query.limit));
  if (query.cursor) p.set('cursor', query.cursor);
  const s = p.toString();
  return fetchWithAuth<AssetSearchPage>(`/assets${s ? `?${s}` : ''}`);
}

/** The statuses a picture may be linked with (`ASSET_NOT_LINKABLE` otherwise). */
export const LINKABLE_PICTURE_STATUSES: readonly AssetStatus[] = ['active', 'quarantined'];
