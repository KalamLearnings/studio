/**
 * useAssets Hook
 *
 * Custom hook for managing asset library state and operations.
 * Provides a clean API for components to interact with assets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Asset, AssetCategory, AssetUploadData } from '@/lib/types/assets';
import type { RegistryAsset, StatusFilter } from '@/lib/types/assetRegistry';
import {
  getAssets,
  uploadAsset,
  type AssetFilters,
} from '@/lib/services/assetService';
import { matchesStatusFilter } from '@/lib/assets/label';

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
  /** Puts a relabelled registry row's status and label on its library entry. */
  applyRegistryAsset: (asset: RegistryAsset) => void;
  selectedStatus: StatusFilter | undefined;
  setStatus: (status: StatusFilter | undefined) => void;
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
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter | undefined>(undefined);

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
        status: selectedStatus,
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
  }, [selectedCategory, searchQuery, selectedStatus]);

  /**
   * Upload a new asset
   */
  const uploadNewAsset = useCallback(async (data: AssetUploadData): Promise<Asset> => {
    setError(null);

    try {
      const newAsset = await uploadAsset(data);

      // The backend answers the registered asset when the same file was
      // uploaded before, so it may already be in the list. A new image has no
      // category, so it shows only when no category filter is set.
      setAssets(prev => {
        const rest = prev.filter(asset => asset.id !== newAsset.id);
        const shown =
          (!selectedCategory || selectedCategory === newAsset.category) &&
          matchesStatusFilter(newAsset.status, selectedStatus);
        return shown ? [newAsset, ...rest] : rest;
      });

      return newAsset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload asset';
      setError(errorMessage);
      throw err;
    }
  }, [selectedCategory, selectedStatus]);

  /**
   * Apply a label result to the matching entry
   */
  const applyRegistryAsset = useCallback((registered: RegistryAsset) => {
    setAssets(prev =>
      prev
        .map(asset =>
          asset.registryId === registered.id
            ? { ...asset, status: registered.status, label: registered.label }
            : asset
        )
        .filter(asset => matchesStatusFilter(asset.status, selectedStatus))
    );
  }, [selectedStatus]);

  /**
   * Set category filter
   */
  const setCategory = useCallback((category: AssetCategory | undefined) => {
    setSelectedCategory(category);
  }, []);

  const setStatus = useCallback((status: StatusFilter | undefined) => {
    setSelectedStatus(status);
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
    applyRegistryAsset,
    selectedStatus,
    setStatus,
    setCategory,
    setSearchQuery,
    refetch,
  };
}
