/**
 * TypeScript types for Asset Library
 *
 * Centralized asset management for curriculum images
 */

export type AssetCategory =
  | 'letters'
  | 'words'
  | 'fruits'
  | 'animals'
  | 'shapes'
  | 'colors'
  | 'numbers'
  | 'misc';

export interface Asset {
  id: string;
  name: string; // Original filename stored in Supabase
  displayName: string; // Human-readable name for the asset
  url: string;
  category: AssetCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  fileSize?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface AssetUploadData {
  displayName: string;
  category: AssetCategory;
  tags: string[];
  file: File;
}

export const ASSET_CATEGORIES: Record<AssetCategory, { label: string; icon: string }> = {
  letters: { label: 'Letters', icon: '🔤' },
  words: { label: 'Words', icon: '📝' },
  fruits: { label: 'Fruits', icon: '🍎' },
  animals: { label: 'Animals', icon: '🐘' },
  shapes: { label: 'Shapes', icon: '⬛' },
  colors: { label: 'Colors', icon: '🎨' },
  numbers: { label: 'Numbers', icon: '🔢' },
  misc: { label: 'Miscellaneous', icon: '📦' },
};
