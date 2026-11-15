/**
 * useAudio Hook
 *
 * Custom hook for managing audio library state and operations.
 * Provides a clean API for components to interact with audio assets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AudioAsset, AudioCategory, AudioUploadData } from '@/lib/types/audio';
import type { PersonStatus, RegistryAsset, StatusFilter } from '@/lib/types/assetRegistry';
import {
  getAudioAssets,
  replaceAudioAsset,
  setAudioStatus,
  uploadAudioAsset,
  updateAudioAsset,
  type AudioFilters,
} from '@/lib/services/audioService';
import { matchesStatusFilter } from '@/lib/assets/label';

interface UseAudioOptions {
  initialCategory?: AudioCategory;
  autoLoad?: boolean;
}

interface UseAudioReturn {
  audioAssets: AudioAsset[];
  loading: boolean;
  error: string | null;
  selectedCategory: AudioCategory | undefined;
  searchQuery: string;

  loadAudio: () => Promise<void>;
  uploadNewAudio: (data: AudioUploadData) => Promise<AudioAsset>;
  updateAudio: (id: string, updates: Partial<Pick<AudioAsset, 'displayName' | 'category' | 'tags' | 'metadata'>>) => Promise<AudioAsset>;
  /** Replaces a clip's file; the old clip is superseded and the new one takes its place in the list. */
  replaceAudio: (id: string, data: AudioUploadData) => Promise<AudioAsset>;
  /** Retires a clip or makes it active again; the file is never deleted. */
  changeAudioStatus: (id: string, status: PersonStatus) => Promise<AudioAsset>;
  /** Puts a relabelled registry row's status and label on its library row. */
  applyRegistryAsset: (asset: RegistryAsset) => void;
  selectedStatus: StatusFilter | undefined;
  setStatus: (status: StatusFilter | undefined) => void;
  setCategory: (category: AudioCategory | undefined) => void;
  setSearchQuery: (query: string) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing audio assets with filtering, search, and CRUD operations
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { initialCategory, autoLoad = true } = options;

  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AudioCategory | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter | undefined>(undefined);

  const loadAudio = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: AudioFilters = {
        category: selectedCategory,
        searchQuery: searchQuery || undefined,
        status: selectedStatus,
      };

      const fetchedAudio = await getAudioAssets(filters);
      setAudioAssets(fetchedAudio);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio';
      setError(errorMessage);
      console.error('Error loading audio:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, selectedStatus]);

  const uploadNewAudio = useCallback(async (data: AudioUploadData): Promise<AudioAsset> => {
    setError(null);

    try {
      const newAudio = await uploadAudioAsset(data);

      // The backend answers the registered asset when the same file was
      // uploaded before, so the row may already be in the list.
      setAudioAssets(prev => {
        const rest = prev.filter(audio => audio.id !== newAudio.id);
        const shown =
          (!selectedCategory || selectedCategory === newAudio.category) &&
          matchesStatusFilter(newAudio.status, selectedStatus);
        return shown ? [newAudio, ...rest] : rest;
      });

      return newAudio;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload audio';
      setError(errorMessage);
      throw err;
    }
  }, [selectedCategory, selectedStatus]);

  const updateAudio = useCallback(async (
    id: string,
    updates: Partial<Pick<AudioAsset, 'displayName' | 'category' | 'tags' | 'metadata'>>
  ): Promise<AudioAsset> => {
    setError(null);

    try {
      const updated = await updateAudioAsset(id, updates);
      setAudioAssets(prev => prev.map(audio => audio.id === id ? updated : audio));
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update audio';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const replaceAudio = useCallback(async (id: string, data: AudioUploadData): Promise<AudioAsset> => {
    setError(null);
    try {
      const next = await replaceAudioAsset(id, data);
      // The superseded clip leaves the default list; the new one takes its place.
      setAudioAssets(prev => {
        const shown =
          (!selectedCategory || selectedCategory === next.category) &&
          matchesStatusFilter(next.status, selectedStatus);
        const rest = prev
          .filter(audio => audio.id !== next.id)
          .map(audio => (audio.id === id ? { ...audio, status: 'superseded' as const } : audio))
          .filter(audio => matchesStatusFilter(audio.status, selectedStatus));
        return shown ? [next, ...rest] : rest;
      });
      return next;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to replace audio';
      setError(errorMessage);
      throw err;
    }
  }, [selectedCategory, selectedStatus]);

  const changeAudioStatus = useCallback(async (id: string, status: PersonStatus): Promise<AudioAsset> => {
    setError(null);
    try {
      const updated = await setAudioStatus(id, status);
      setAudioAssets(prev =>
        prev
          .map(audio => (audio.id === id ? updated : audio))
          .filter(audio => matchesStatusFilter(audio.status, selectedStatus))
      );
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change the audio status';
      setError(errorMessage);
      throw err;
    }
  }, [selectedStatus]);

  const applyRegistryAsset = useCallback((asset: RegistryAsset) => {
    setAudioAssets(prev =>
      prev
        .map(audio =>
          audio.id === asset.id ? { ...audio, status: asset.status, label: asset.label } : audio
        )
        .filter(audio => matchesStatusFilter(audio.status, selectedStatus))
    );
  }, [selectedStatus]);

  const setCategory = useCallback((category: AudioCategory | undefined) => {
    setSelectedCategory(category);
  }, []);

  const setStatus = useCallback((status: StatusFilter | undefined) => {
    setSelectedStatus(status);
  }, []);

  const refetch = useCallback(() => loadAudio(), [loadAudio]);

  useEffect(() => {
    if (autoLoad) {
      loadAudio();
    }
  }, [autoLoad, loadAudio]);

  return {
    audioAssets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    loadAudio,
    uploadNewAudio,
    updateAudio,
    replaceAudio,
    changeAudioStatus,
    applyRegistryAsset,
    selectedStatus,
    setStatus,
    setCategory,
    setSearchQuery,
    refetch,
  };
}
