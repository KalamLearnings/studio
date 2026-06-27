/**
 * Audio Service Layer
 *
 * Handles all Supabase interactions for audio asset management.
 * Uses audio_assets table for metadata + storage for files.
 */

import { createClient } from '@/lib/supabase/client';
import type { AudioAsset, AudioCategory, AudioUploadData } from '@/lib/types/audio';
import { SUPPORTED_AUDIO_TYPES, MAX_AUDIO_FILE_SIZE } from '@/lib/types/audio';

const BUCKET_NAME = 'curriculum-audio';
const AUDIO_FOLDER = 'audio';

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

function rowToAudioAsset(row: AudioAssetRow, publicUrl: string): AudioAsset {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    url: publicUrl,
    storagePath: row.storage_path,
    category: row.category,
    tags: row.tags || [],
    durationMs: row.duration_ms ?? undefined,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

  return rows.map((row: AudioAssetRow) => {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(row.storage_path);

    return rowToAudioAsset(row, publicUrl);
  });
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

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.storage_path);

  return rowToAudioAsset(data, publicUrl);
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
 * Uploads a new audio asset
 */
export async function uploadAudioAsset(data: AudioUploadData): Promise<AudioAsset> {
  const supabase = createClient();
  const { displayName, file, category, tags, metadata } = data;

  validateAudioFile(file);

  const extension = file.name.split('.').pop() || 'mp3';
  const sanitizedDisplayName = displayName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  const timestamp = Date.now();
  const filename = `${sanitizedDisplayName}__${timestamp}.${extension}`;
  const storagePath = `${AUDIO_FOLDER}/${category}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading audio file:', uploadError);
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from('audio_assets')
    .insert({
      name: filename,
      display_name: displayName,
      storage_path: storagePath,
      category,
      tags,
      file_size: file.size,
      mime_type: file.type,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    console.error('Error inserting audio asset record:', insertError);
    throw new Error(`Failed to save audio metadata: ${insertError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return rowToAudioAsset(insertedRow, publicUrl);
}

/**
 * Updates audio asset metadata
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

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.storage_path);

  return rowToAudioAsset(data, publicUrl);
}

/**
 * Deletes an audio asset (both file and metadata)
 */
export async function deleteAudioAsset(id: string): Promise<void> {
  const supabase = createClient();

  const { data: asset, error: fetchError } = await supabase
    .from('audio_assets')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching audio asset for deletion:', fetchError);
    throw new Error(`Failed to find audio asset: ${fetchError.message}`);
  }

  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([asset.storage_path]);

  if (storageError) {
    console.warn('Error deleting audio file from storage:', storageError);
  }

  const { error: deleteError } = await supabase
    .from('audio_assets')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting audio asset record:', deleteError);
    throw new Error(`Failed to delete audio asset: ${deleteError.message}`);
  }
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

  return (data || []).map((row: AudioAssetRow) => {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(row.storage_path);

    return rowToAudioAsset(row, publicUrl);
  });
}
