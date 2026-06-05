/**
 * Asset Service Layer
 *
 * Handles all Supabase interactions for asset management.
 * Single source of truth for CRUD operations on assets.
 */

import { createClient } from '@/lib/supabase/client';
import type { Asset, AssetCategory, AssetUploadData } from '@/lib/types/assets';
import { compressImage } from '@/lib/utils/imageUpload';

const BUCKET_NAME = 'curriculum-images';
const ASSETS_FOLDER = 'assets';

export interface AssetFilters {
  category?: AssetCategory;
  searchQuery?: string;
  tags?: string[];
}

/**
 * Fetches all assets from storage with optional filtering
 */
export async function getAssets(filters?: AssetFilters): Promise<Asset[]> {
  const supabase = createClient();

  let allAssets: Asset[] = [];

  // If specific category is selected, list only that category
  if (filters?.category) {
    const folderPath = `${ASSETS_FOLDER}/${filters.category}`;
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error fetching assets:', error);
      throw new Error(`Failed to fetch assets: ${error.message}`);
    }

    if (files) {
      allAssets = convertFilesToAssets(files, filters.category, supabase);
    }
  } else {
    // No category selected - fetch from all categories
    const categories: AssetCategory[] = [
      'letters', 'words', 'fruits', 'animals',
      'shapes', 'colors', 'numbers', 'misc'
    ];

    // Fetch files from each category folder
    const promises = categories.map(async (category) => {
      const folderPath = `${ASSETS_FOLDER}/${category}`;
      const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.warn(`Error fetching assets from ${category}:`, error);
        return [];
      }

      return files ? convertFilesToAssets(files, category, supabase) : [];
    });

    const results = await Promise.all(promises);
    allAssets = results.flat();

    // Sort by creation date (newest first)
    allAssets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  console.log('Total assets loaded:', allAssets.length);

  // Apply search filter
  if (filters?.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    return allAssets.filter(asset =>
      asset.name.toLowerCase().includes(query) ||
      asset.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  return allAssets;
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

      console.log('Asset URL:', publicUrl);

      return {
        id: filePath,
        name: file.name,
        displayName: extractDisplayNameFromFilename(file.name),
        url: publicUrl,
        category,
        tags: extractTagsFromFilename(file.name),
        createdAt: file.created_at || new Date().toISOString(),
        updatedAt: file.updated_at || new Date().toISOString(),
        fileSize: file.metadata?.size,
      };
    });
}

/**
 * Uploads a new asset to storage
 */
export async function uploadAsset(data: AssetUploadData): Promise<Asset> {
  const supabase = createClient();
  const { displayName, file, category, tags } = data;

  // Compress image
  const compressedFile = await compressImage(file);

  // Get file extension
  const extension = file.name.split('.').pop() || 'png';

  // Sanitize display name (remove special characters)
  const sanitizedDisplayName = displayName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');

  // Generate filename: {displayName}__{timestamp}.{ext}
  // Format allows easy extraction of displayName later
  const timestamp = Date.now();
  const filename = `${sanitizedDisplayName}__${timestamp}.${extension}`;
  const filePath = `${ASSETS_FOLDER}/${category}/${filename}`;

  // Upload to Supabase Storage
  const { data: uploadData, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressedFile, {
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading asset:', error);
    throw new Error(`Failed to upload asset: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    id: uploadData.path,
    name: filename,
    displayName: displayName,
    url: publicUrl,
    category,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deletes an asset from storage
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([assetId]);

  if (error) {
    console.error('Error deleting asset:', error);
    throw new Error(`Failed to delete asset: ${error.message}`);
  }
}

/**
 * Updates asset metadata (rename, retag)
 * Note: Supabase Storage doesn't support metadata updates directly,
 * so this would require re-uploading with new filename
 */
export async function updateAssetTags(
  asset: Asset,
  newTags: string[]
): Promise<Asset> {
  // For now, we'll just return the asset with updated tags
  // In a full implementation, you might want to re-upload with new filename
  return {
    ...asset,
    tags: newTags,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Helper: Extract category from file path or name
 */
function extractCategoryFromPath(path: string): AssetCategory {
  const parts = path.split('/');
  const categoryPart = parts[parts.length - 2];

  const validCategories: AssetCategory[] = [
    'letters', 'words', 'fruits', 'animals',
    'shapes', 'colors', 'numbers', 'misc'
  ];

  return validCategories.includes(categoryPart as AssetCategory)
    ? (categoryPart as AssetCategory)
    : 'misc';
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
