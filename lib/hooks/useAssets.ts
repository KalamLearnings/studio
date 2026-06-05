/**
 * useAssets Hook
 *
 * Custom hook for managing asset library state and operations.
 * Provides a clean API for components to interact with assets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Asset, AssetCategory, AssetUploadData } from '@/lib/types/assets';
import {
  getAssets,
  uploadAsset,
  deleteAsset,
  type AssetFilters,
} from '@/lib/services/assetService';

interface UseAssetsOptions {
  initialCategory?: AssetCategory;
  autoLoad?: boolean;
}

interface UseAssetsReturn {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  selectedCategory: AssetCategory | undefined;
  searchQuery: string;

  // Actions
  loadAssets: () => Promise<void>;
  uploadNewAsset: (data: AssetUploadData) => Promise<Asset>;
  removeAsset: (assetId: string) => Promise<void>;
  setCategory: (category: AssetCategory | undefined) => void;
  setSearchQuery: (query: string) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing assets with filtering, search, and CRUD operations
 */
export function useAssets(options: UseAssetsOptions = {}): UseAssetsReturn {
  const { initialCategory, autoLoad = true } = options;

  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Load assets with current filters
   */
  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: AssetFilters = {
        category: selectedCategory,
        searchQuery: searchQuery || undefined,
      };

      const fetchedAssets = await getAssets(filters);
      setAssets(fetchedAssets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assets';
      setError(errorMessage);
      console.error('Error loading assets:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  /**
   * Upload a new asset
   */
  const uploadNewAsset = useCallback(async (data: AssetUploadData): Promise<Asset> => {
    setError(null);

    try {
      const newAsset = await uploadAsset(data);

      // Add to local state if it matches current filters
      if (!selectedCategory || selectedCategory === data.category) {
        setAssets(prev => [newAsset, ...prev]);
      }

      return newAsset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload asset';
      setError(errorMessage);
      throw err;
    }
  }, [selectedCategory]);

  /**
   * Delete an asset
   */
  const removeAsset = useCallback(async (assetId: string): Promise<void> => {
    setError(null);

    try {
      await deleteAsset(assetId);

      // Remove from local state
      setAssets(prev => prev.filter(asset => asset.id !== assetId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete asset';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Set category filter
   */
  const setCategory = useCallback((category: AssetCategory | undefined) => {
    setSelectedCategory(category);
  }, []);

  /**
   * Refetch assets (useful after external changes)
   */
  const refetch = useCallback(() => loadAssets(), [loadAssets]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    if (autoLoad) {
      loadAssets();
    }
  }, [autoLoad, loadAssets]);

  return {
    assets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    loadAssets,
    uploadNewAsset,
    removeAsset,
    setCategory,
    setSearchQuery,
    refetch,
  };
}
