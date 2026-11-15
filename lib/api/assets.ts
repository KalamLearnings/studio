/**
 * The asset registry's backend routes (`assets` edge function, CM-B5).
 *
 * Every library upload and every label change goes through here (CM-S4):
 * the backend measures the file, names its path, stores it and writes the
 * `assets` row (and, for audio, the `audio_assets` catalogue row under the
 * same id). Studio never names a path or writes these tables itself.
 */

import { ApiError, fetchWithAuth } from './client';
import type { AudioCategory } from '@/lib/types/audio';
import type { AssetLabel, AssetProvenance, RegistryAsset } from '@/lib/types/assetRegistry';

export interface LibraryUploadInput {
  file: Blob;
  /** Free text for the library list; never the label. */
  displayName: string;
  /** Required for audio (the catalogue category, which also gives the label role). */
  category?: AudioCategory;
  /** The label locale, when known. */
  locale?: string;
  tags?: string[];
  /** Catalogue metadata (`ttsText`, `voiceId`, `letterId`, `wordId`). */
  metadata?: Record<string, unknown>;
  /** Label fields the uploader states; they win over what category and metadata give. */
  label?: Partial<AssetLabel>;
  /** Present when the file was made by TTS. */
  provenance?: AssetProvenance;
}

export interface LibraryUploadResult {
  asset: RegistryAsset;
  /** False when the same file was already registered. */
  created: boolean;
  /** The `audio_assets` id (equal to the asset id) for audio; null otherwise. */
  audioAssetId: string | null;
}

/** `POST /assets/library`: 201 when registered, 200 when the same file already was. */
export async function uploadLibraryAsset(input: LibraryUploadInput): Promise<LibraryUploadResult> {
  const form = new FormData();
  const fileName = input.file instanceof File ? input.file.name : 'upload';
  form.append('file', input.file, fileName);
  form.append('displayName', input.displayName);
  if (input.category) form.append('category', input.category);
  if (input.locale) form.append('locale', input.locale);
  if (input.tags) form.append('tags', JSON.stringify(input.tags));
  if (input.metadata) form.append('metadata', JSON.stringify(input.metadata));
  if (input.label) form.append('label', JSON.stringify(input.label));
  if (input.provenance) form.append('provenance', JSON.stringify(input.provenance));

  return fetchWithAuth<LibraryUploadResult>('/assets/library', {
    method: 'POST',
    body: form,
  });
}

/** `GET /assets/:assetId`; null when the file has no registry row. */
export async function getRegistryAsset(assetId: string): Promise<RegistryAsset | null> {
  try {
    return await fetchWithAuth<RegistryAsset>(`/assets/${encodeURIComponent(assetId)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * `PUT /assets/:assetId/label`: the whole label (a missing field clears it).
 * A quarantined file whose label identifies it becomes active.
 */
export async function labelRegistryAsset(
  assetId: string,
  label: AssetLabel,
): Promise<RegistryAsset> {
  return fetchWithAuth<RegistryAsset>(`/assets/${encodeURIComponent(assetId)}/label`, {
    method: 'PUT',
    body: JSON.stringify(label),
  });
}
