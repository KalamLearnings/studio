/**
 * Image library service.
 *
 * Lists the `assets` registry's images (staff read) together with the legacy
 * files under `assets/<category>/` in the `curriculum-images` bucket that are
 * not registered yet. Uploads go through the backend (`POST /assets/library`,
 * CM-B5), which names the path and registers the file. Studio never writes,
 * moves or deletes image files itself (D8, D9; CM-S4).
 */

import { createClient } from '@/lib/supabase/client';
import type { Asset, AssetCategory, AssetUploadData } from '@/lib/types/assets';
import { ASSET_CATEGORIES } from '@/lib/types/assets';
import type { RegistryAsset, StatusFilter } from '@/lib/types/assetRegistry';
import { compressImage } from '@/lib/utils/imageUpload';
import { uploadLibraryAsset } from '@/lib/api/assets';
import {
  listRegistryEntries,
  registryPublicUrl,
  type RegistryEntry,
} from '@/lib/services/assetRegistryService';
import { describeLabel, matchesStatusFilter } from '@/lib/assets/label';

const BUCKET_NAME = 'curriculum-images';
const ASSETS_FOLDER = 'assets';

export interface AssetFilters {
  category?: AssetCategory;
  searchQuery?: string;
  tags?: string[];
  /** Registry status (quarantined, orphan, ...) or `unregistered`. */
  status?: StatusFilter;
}

/**
 * Fetches the image library: registered images plus legacy files not yet in
 * the registry, newest first, with optional filtering.
 */
export async function getAssets(filters?: AssetFilters): Promise<Asset[]> {
  const [legacy, registered] = await Promise.all([
    listLegacyFiles(filters?.category),
    listRegistryEntries('image'),
  ]);

  const byPath = new Map<string, RegistryEntry>();
  for (const entry of registered) {
    if (entry.bucket === BUCKET_NAME) byPath.set(entry.path, entry);
  }

  // A legacy file that the registry knows shows as the registered asset,
  // keeping its folder category and file-name display name.
  const merged: Asset[] = legacy.map((asset) => {
    const entry = byPath.get(asset.id);
    if (!entry) return asset;
    byPath.delete(asset.id);
    return withRegistryEntry(asset, entry);
  });
  byPath.forEach((entry) => merged.push(registeredOnlyAsset(entry)));

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const query = filters?.searchQuery?.toLowerCase();
  return merged.filter(
    (asset) =>
      (!filters?.category || asset.category === filters.category) &&
      matchesStatusFilter(asset.status, filters?.status) &&
      (!query ||
        asset.name.toLowerCase().includes(query) ||
        asset.displayName.toLowerCase().includes(query) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        (describeLabel(asset.label) ?? '').toLowerCase().includes(query))
  );
}

/** The legacy files under `assets/<category>/` (one category, or all). */
async function listLegacyFiles(category?: AssetCategory): Promise<Asset[]> {
  const supabase = createClient();
  // Derived from ASSET_CATEGORIES so adding a category needs one edit, not three
  const categories = category ? [category] : (Object.keys(ASSET_CATEGORIES) as AssetCategory[]);

  const results = await Promise.all(
    categories.map(async (cat) => {
      const folderPath = `${ASSETS_FOLDER}/${cat}`;
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        if (category) {
          console.error('Error fetching assets:', error);
          throw new Error(`Failed to fetch assets: ${error.message}`);
        }
        console.warn(`Error fetching assets from ${cat}:`, error);
        return [];
      }

      return files ? convertFilesToAssets(files, cat, supabase) : [];
    })
  );
  return results.flat();
}

function withRegistryEntry(asset: Asset, entry: RegistryEntry): Asset {
  return {
    ...asset,
    id: entry.id,
    registryId: entry.id,
    status: entry.status,
    label: entry.label,
    fileSize: entry.bytes,
    dimensions:
      entry.width && entry.height ? { width: entry.width, height: entry.height } : asset.dimensions,
  };
}

/** The legacy folder category of a path (`assets/<category>/...`), else null. */
function categoryOfPath(path: string): AssetCategory | null {
  const [folder, cat] = path.split('/');
  return folder === ASSETS_FOLDER && !!cat && cat in ASSET_CATEGORIES ? (cat as AssetCategory) : null;
}

/** A registered image (backend-named path); its label is the only name it has. */
function registeredOnlyAsset(entry: RegistryEntry): Asset {
  const name = entry.path.split('/').pop() ?? entry.path;
  return {
    id: entry.id,
    registryId: entry.id,
    name,
    displayName: describeLabel(entry.label) ?? 'Unlabelled image',
    url: registryPublicUrl(entry),
    category: categoryOfPath(entry.path),
    status: entry.status,
    label: entry.label,
    tags: [],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    fileSize: entry.bytes,
    dimensions:
      entry.width && entry.height ? { width: entry.width, height: entry.height } : undefined,
  };
}

/** The library entry for an image the backend just registered. */
export function assetFromRegistry(asset: RegistryAsset): Asset {
  return registeredOnlyAsset({
    id: asset.id,
    bucket: asset.bucket,
    path: asset.path,
    media: asset.media,
    mime: asset.mime,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    durationMs: asset.durationMs,
    status: asset.status,
    label: asset.label,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  });
}

/**
 * Helper: Convert storage files to Asset objects
 */
function convertFilesToAssets(
  files: any[],
  category: AssetCategory,
  supabase: any
): Asset[] {
  return files
    .filter(file => {
      // Skip folders and hidden files
      const isHidden = file.name.startsWith('.');
      const isEmpty = !file.name || file.name.length === 0;
      return !isHidden && !isEmpty;
    })
    .map(file => {
      const filePath = `${ASSETS_FOLDER}/${category}/${file.name}`;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        id: filePath,
        registryId: null,
        name: file.name,
        displayName: extractDisplayNameFromFilename(file.name),
        url: publicUrl,
        category,
        status: null,
        label: null,
        tags: extractTagsFromFilename(file.name),
        createdAt: file.created_at || new Date().toISOString(),
        updatedAt: file.updated_at || new Date().toISOString(),
        fileSize: file.metadata?.size,
      };
    });
}

/**
 * Uploads a new image through the backend (`POST /assets/library`). The
 * backend names the path and registers the file; with no label it starts
 * quarantined until a person labels it.
 *
 * The registry has no display name, category or tags for images yet: the
 * name is sent (the route requires it) but only audio keeps it (CM-S4 handoff).
 */
export async function uploadAsset(data: AssetUploadData): Promise<Asset> {
  const { displayName, file, tags } = data;
  const compressedFile = await compressImage(file);
  const result = await uploadLibraryAsset({ file: compressedFile, displayName, tags });
  return assetFromRegistry(result.asset);
}

/**
 * Helper: Extract tags from filename
 * Expects format: tag1-tag2_timestamp_filename.ext
 */
function extractTagsFromFilename(filename: string): string[] {
  const parts = filename.split('_');
  if (parts.length > 1) {
    const tagsPart = parts[0];
    return tagsPart.split('-').filter(tag => tag.length > 0 && !/^\d+$/.test(tag));
  }
  return [];
}

/**
 * Helper: Extract display name from filename
 * Expects format: {displayName}__{timestamp}.{ext}
 * Falls back to filename without extension for legacy files
 */
function extractDisplayNameFromFilename(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Check if it has our format (displayName__timestamp)
  if (nameWithoutExt.includes('__')) {
    const parts = nameWithoutExt.split('__');
    // Replace hyphens with spaces and capitalize
    return parts[0].replace(/-/g, ' ');
  }

  // Fallback for legacy files or files without our format
  // Just return the filename without extension
  return nameWithoutExt.replace(/-/g, ' ');
}
