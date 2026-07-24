/**
 * Animation Upload Utilities
 *
 * Handles Rive (.riv) animation uploads to Supabase Storage.
 * Mirrors the imageUpload/assetService patterns against the
 * curriculum-animations bucket.
 */

import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'curriculum-animations';
const ANIMATIONS_FOLDER = 'activities';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface AnimationAsset {
  /** Storage path — doubles as the unique id */
  id: string;
  name: string;
  displayName: string;
  url: string;
  createdAt: string;
  fileSize?: number;
}

/**
 * Upload a .riv animation to Supabase Storage.
 *
 * Validates by extension rather than MIME type — browsers report .riv files
 * as application/octet-stream (or nothing), so file.type is unreliable.
 */
export async function uploadAnimation(file: File, displayName?: string): Promise<AnimationAsset> {
  if (!file.name.toLowerCase().endsWith('.riv')) {
    throw new Error('Invalid file type. Only Rive (.riv) files are allowed.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const baseName = (displayName || file.name.replace(/\.riv$/i, ''))
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  const timestamp = Date.now();
  const filename = `${baseName}__${timestamp}.riv`;
  const filePath = `${ANIMATIONS_FOLDER}/${filename}`;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    console.error('Animation upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    id: data.path,
    name: filename,
    displayName: extractDisplayName(filename),
    url: publicUrl,
    createdAt: new Date().toISOString(),
    fileSize: file.size,
  };
}

/**
 * List all uploaded animations, newest first.
 */
export async function listAnimations(): Promise<AnimationAsset[]> {
  const supabase = createClient();

  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(ANIMATIONS_FOLDER, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('Error listing animations:', error);
    throw new Error(`Failed to load animations: ${error.message}`);
  }

  return (files ?? [])
    .filter((file) => file.name.toLowerCase().endsWith('.riv'))
    .map((file) => {
      const filePath = `${ANIMATIONS_FOLDER}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        id: filePath,
        name: file.name,
        displayName: extractDisplayName(file.name),
        url: publicUrl,
        createdAt: file.created_at || new Date().toISOString(),
        fileSize: file.metadata?.size,
      };
    });
}

/**
 * Extract display name from `{displayName}__{timestamp}.riv` filenames,
 * falling back to the raw filename for files uploaded outside the studio.
 */
function extractDisplayName(filename: string): string {
  const nameWithoutExt = filename.replace(/\.riv$/i, '');
  const base = nameWithoutExt.includes('__')
    ? nameWithoutExt.split('__')[0]
    : nameWithoutExt;
  return base.replace(/-/g, ' ');
}
