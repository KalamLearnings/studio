/**
 * Audio Service Layer
 *
 * The audio library. Reads come from the `audio_assets` catalogue joined with
 * the `assets` registry (status, label). Uploads go through the backend
 * (`POST /assets/library`, CM-B5): Studio no longer writes library files or
 * `audio_assets` rows itself, and never deletes a file (D9) (CM-S4).
 */

import {
  createClient,
  getEnvironmentBaseUrl,
  getEdgeFunctionAuthHeaders,
} from '@/lib/supabase/client';
import type { AudioAsset, AudioCategory, AudioUploadData } from '@/lib/types/audio';
import { SUPPORTED_AUDIO_TYPES, MAX_AUDIO_FILE_SIZE } from '@/lib/types/audio';
import type { AssetProvenance, StatusFilter } from '@/lib/types/assetRegistry';
import { uploadLibraryAsset } from '@/lib/api/assets';
import { getRegistryEntries, type RegistryEntry } from '@/lib/services/assetRegistryService';
import { matchesStatusFilter } from '@/lib/assets/label';

const BUCKET_NAME = 'curriculum-audio';
const AUDIO_FOLDER = 'audio';

/**
 * Generate conditional-response audio from text and store it, returning a FULL
 * public URL.
 *
 * Conditional audio is NOT backend-owned (unlike instruction audio): the
 * dashboard must produce the file. This reuses the existing /tts edge function
 * and the same curriculum-audio bucket as uploadAudioAsset.
 *
 * It deliberately returns a fully-qualified public URL (not a relative path)
 * because (a) the schema's audio_url is .url(), (b) the mobile player uses the
 * value verbatim with no resolver, and (c) the backend's read-time resolver only
 * rewrites conditionalAudio.rules[] paths, NOT the predefined slot paths — so a
 * relative slot path would never resolve. A full URL sidesteps all of that.
 */
export async function generateConditionalAudio(
  text: string,
  voiceId?: string,
): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in.');
  }

  // 1. Synthesize via the shared TTS edge function (Arabic, like instruction/library TTS).
  const ttsResponse = await fetch(`${getEnvironmentBaseUrl()}/functions/v1/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getEdgeFunctionAuthHeaders(session.access_token),
    },
    body: JSON.stringify({ text, language: 'ar', voice_id: voiceId }),
  });

  if (!ttsResponse.ok) {
    const err = await ttsResponse.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate audio');
  }

  const responseData = await ttsResponse.json();
  const data = responseData.data || responseData;

  // 2. base64 -> bytes
  const binary = atob(data.audio_data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // 3. Upload to a unique path under the conditional/ folder.
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const storagePath = `${AUDIO_FOLDER}/conditional/${timestamp}_${rand}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, bytes, {
      contentType: data.content_type || 'audio/mpeg',
      cacheControl: '60',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload conditional audio: ${uploadError.message}`);
  }

  // 4. Return the full public URL.
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  return publicUrl;
}

/**
 * Resolve an audio reference to a playable URL.
 *
 * The backend stores instruction audio as a RELATIVE storage path (e.g.
 * `instructions/foo.mp3`) so it is portable across environments. Such a path is
 * not playable as-is — a browser resolves it against the current page origin
 * (e.g. studio.kalamkidslearning.com) and 404s. This converts a relative bucket
 * path into the environment-correct Supabase public URL, while passing through
 * values that are already playable (absolute http(s) URLs and blob: URLs).
 *
 * Returns null for empty input.
 */
export function resolveAudioUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (/^(https?:|blob:|data:)/.test(ref)) return ref;

  const supabase = createClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(ref);
  return publicUrl;
}

export interface AudioFilters {
  category?: AudioCategory;
  searchQuery?: string;
  tags?: string[];
  /** Registry status (quarantined, orphan, ...) or `unregistered`. */
  status?: StatusFilter;
}

interface AudioAssetRow {
  id: string;
  name: string;
  display_name: string;
  storage_path: string;
  category: AudioCategory;
  tags: string[];
  duration_ms: number | null;
  file_size: number | null;
  mime_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Append a version query derived from `updated_at` so Studio fetches fresh bytes
 * after a regenerate-in-place overwrite. The storage path (and thus the base
 * URL embedded in activity configs) is unchanged — only Studio's own reads bust
 * the browser/CDN cache. Without this, an overwritten clip keeps playing the old
 * cached object because the public URL is byte-identical.
 */
function withCacheBuster(publicUrl: string, updatedAt: string): string {
  if (!updatedAt) return publicUrl;
  const version = Date.parse(updatedAt);
  if (Number.isNaN(version)) return publicUrl;
  const separator = publicUrl.includes('?') ? '&' : '?';
  return `${publicUrl}${separator}v=${version}`;
}

function rowToAudioAsset(
  row: AudioAssetRow,
  publicUrl: string,
  registry: RegistryEntry | undefined,
): AudioAsset {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    url: withCacheBuster(publicUrl, row.updated_at),
    storagePath: row.storage_path,
    category: row.category,
    tags: row.tags || [],
    durationMs: row.duration_ms ?? undefined,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: registry?.status ?? null,
    label: registry?.label ?? null,
  };
}

/** Maps catalogue rows to library assets with their registry status and label. */
async function withRegistry(rows: AudioAssetRow[]): Promise<AudioAsset[]> {
  const supabase = createClient();
  const registry = await getRegistryEntries(rows.map((row) => row.id));
  return rows.map((row) => {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(row.storage_path);
    return rowToAudioAsset(row, publicUrl, registry.get(row.id));
  });
}

/**
 * Fetches all audio assets from database with optional filtering
 */
export async function getAudioAssets(filters?: AudioFilters): Promise<AudioAsset[]> {
  const supabase = createClient();

  let query = supabase
    .from('audio_assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching audio assets:', error);
    throw new Error(`Failed to fetch audio assets: ${error.message}`);
  }

  let rows = (data || []) as AudioAssetRow[];

  // Search matches display name, name, and tags (substring, case-insensitive).
  // Tags are a text[] column, so a substring `ilike` can't be expressed via the
  // PostgREST `.or()` filter — we filter client-side to cover all three fields.
  if (filters?.searchQuery) {
    const term = filters.searchQuery.toLowerCase();
    rows = rows.filter(
      (row) =>
        row.display_name?.toLowerCase().includes(term) ||
        row.name?.toLowerCase().includes(term) ||
        (row.tags || []).some((tag) => tag.toLowerCase().includes(term))
    );
  }

  const assets = await withRegistry(rows);
  return filters?.status
    ? assets.filter((asset) => matchesStatusFilter(asset.status, filters.status))
    : assets;
}

/**
 * Fetches a single audio asset by ID
 */
export async function getAudioAsset(id: string): Promise<AudioAsset | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('audio_assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching audio asset:', error);
    throw new Error(`Failed to fetch audio asset: ${error.message}`);
  }

  const [asset] = await withRegistry([data as AudioAssetRow]);
  return asset;
}

/**
 * Validates audio file before upload
 */
function validateAudioFile(file: File): void {
  if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    throw new Error(`Unsupported audio format: ${file.type}. Supported: MP3, WAV, OGG, M4A`);
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 10MB`);
  }
}

/**
 * The provenance of a library clip made by the `/tts` function (ElevenLabs),
 * from the catalogue metadata the audio form writes; null for an upload.
 */
function ttsProvenance(metadata: Record<string, unknown> | undefined): AssetProvenance | null {
  const text = metadata?.ttsText;
  const voiceId = metadata?.voiceId;
  if (typeof text !== 'string' || typeof voiceId !== 'string' || !voiceId) return null;
  return {
    provider: 'elevenlabs',
    model: null,
    voiceId,
    promptVersion: null,
    request: { text, language: 'ar' },
  };
}

/**
 * Uploads a new audio asset through the backend (`POST /assets/library`).
 * The backend measures the file, names its path and writes both the `assets`
 * and the `audio_assets` rows under one id; the same file uploaded twice
 * answers the asset already registered.
 */
export async function uploadAudioAsset(data: AudioUploadData): Promise<AudioAsset> {
  const { displayName, file, category, tags, metadata } = data;

  validateAudioFile(file);

  const provenance = ttsProvenance(metadata);
  const result = await uploadLibraryAsset({
    file,
    displayName,
    category,
    tags,
    metadata: metadata || {},
    ...(provenance ? { provenance, locale: 'ar' } : {}),
  });

  const audioId = result.audioAssetId ?? result.asset.id;
  const asset = await getAudioAsset(audioId);
  if (!asset) {
    throw new Error('The audio was stored but its library row could not be read');
  }
  return asset;
}

/**
 * Updates audio asset metadata (display name, tags, metadata) on the
 * `audio_assets` catalogue only. The file, its path and its registry row are
 * untouched. This is still a direct catalogue write: the backend has no route
 * for catalogue fields yet (CM-S4 handoff).
 */
export async function updateAudioAsset(
  id: string,
  updates: Partial<Pick<AudioAsset, 'displayName' | 'tags' | 'metadata'>>
): Promise<AudioAsset> {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  const { data, error } = await supabase
    .from('audio_assets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating audio asset:', error);
    throw new Error(`Failed to update audio asset: ${error.message}`);
  }

  const [asset] = await withRegistry([data as AudioAssetRow]);
  return asset;
}

/**
 * Gets audio assets by letter ID (for letter_sounds category)
 */
export async function getAudioByLetterId(letterId: string): Promise<AudioAsset[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('audio_assets')
    .select('*')
    .eq('category', 'letter_sounds')
    .contains('metadata', { letterId });

  if (error) {
    console.error('Error fetching audio by letter:', error);
    throw new Error(`Failed to fetch audio for letter: ${error.message}`);
  }

  return withRegistry((data || []) as AudioAssetRow[]);
}
