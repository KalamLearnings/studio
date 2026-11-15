/**
 * The asset registry's backend routes (`assets` edge function, CM-B5).
 *
 * Every library upload, label, status, replace and library-field change
 * goes through here (CM-S4):
 * the backend measures the file, names its path, stores it and writes the
 * `assets` row (and, for audio, the `audio_assets` catalogue row under the
 * same id). Studio never names a path or writes these tables itself.
 */

import { ApiError, fetchWithAuth } from './client';
import type { AudioCategory } from '@/lib/types/audio';
import type { AssetCategory } from '@/lib/types/assets';
import type {
  AssetLabel,
  AssetProvenance,
  PersonStatus,
  RegistryAsset,
} from '@/lib/types/assetRegistry';

export interface LibraryUploadInput {
  file: Blob;
  /** Free text for the library list; never the label. */
  displayName: string;
  /**
   * Required for audio (the catalogue category, which also gives the label
   * role); an image may carry one of the image library categories.
   */
  category?: AudioCategory | AssetCategory;
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

/**
 * `PUT /assets/:assetId/status`: retire, quarantine, mark broken or make
 * active again. Nothing is deleted: the file keeps playing wherever it is
 * already used. Library audio not in the registry yet is registered by the
 * backend under its own id on its first status change.
 */
export async function setRegistryAssetStatus(
  assetId: string,
  status: PersonStatus,
): Promise<RegistryAsset> {
  return fetchWithAuth<RegistryAsset>(`/assets/${encodeURIComponent(assetId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export interface ReplaceInput {
  file: Blob;
  /** Library fields to change with the replace; absent ones are kept from the old file. */
  displayName?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  /** Present when the new file was made by TTS. */
  provenance?: AssetProvenance;
}

export interface ReplaceResult {
  /** The new asset. */
  asset: RegistryAsset;
  /** The old asset, now `superseded` (its file and URL stay). */
  replaced: RegistryAsset;
  /** The new `audio_assets` id (equal to the new asset id) for library audio; null otherwise. */
  audioAssetId: string | null;
}

/**
 * `POST /assets/:assetId/replace`: a new file replaces this one. The backend
 * stores it under a new id and path and marks the old asset `superseded`.
 * Activities that already use the old file keep playing it until their
 * references are moved (a later migration).
 */
export async function replaceRegistryAsset(
  assetId: string,
  input: ReplaceInput,
): Promise<ReplaceResult> {
  const form = new FormData();
  const fileName = input.file instanceof File ? input.file.name : 'upload';
  form.append('file', input.file, fileName);
  if (input.displayName) form.append('displayName', input.displayName);
  if (input.category) form.append('category', input.category);
  if (input.tags) form.append('tags', JSON.stringify(input.tags));
  if (input.metadata) form.append('metadata', JSON.stringify(input.metadata));
  if (input.provenance) form.append('provenance', JSON.stringify(input.provenance));
  return fetchWithAuth<ReplaceResult>(`/assets/${encodeURIComponent(assetId)}/replace`, {
    method: 'POST',
    body: form,
  });
}

export interface LibraryFieldsPatch {
  displayName?: string;
  category?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface LibraryFieldsResult {
  /** The registry row; null for library audio not in the registry yet. */
  asset: RegistryAsset | null;
  /** The `audio_assets` row for library audio; null otherwise. */
  audioAsset: { id: string } | null;
}

/**
 * `PUT /assets/:assetId/library`: display name, category, tags and metadata,
 * written by the backend on `assets` and (audio) the `audio_assets` row of
 * the same id. Studio never writes those tables itself.
 */
export async function updateRegistryAssetLibrary(
  assetId: string,
  patch: LibraryFieldsPatch,
): Promise<LibraryFieldsResult> {
  return fetchWithAuth<LibraryFieldsResult>(`/assets/${encodeURIComponent(assetId)}/library`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
