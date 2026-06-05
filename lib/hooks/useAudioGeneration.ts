/**
 * Custom hook for managing TTS audio generation
 * Handles audio blob state, generation, and cleanup
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { resolveTemplateText } from '@/lib/utils/templateResolver';
import type { Letter } from './useLetters';

export interface AudioBlob {
  blob: Blob;
  blobUrl: string;
  filePath: string;
}

interface UseAudioGenerationProps {
  language: 'en' | 'ar';
  text: string;
  existingAudioUrl?: string | null;
  letter?: Letter | null;
  voiceId?: string;
}

interface UseAudioGenerationReturn {
  isGenerating: boolean;
  isPlaying: boolean;
  generatedAudioBlob: AudioBlob | null;
  existingAudioUrl: string | null;
  generateAudio: () => Promise<void>;
  playAudio: () => void;
  clearAudio: () => void;
  hasAudio: boolean;
}

/**
 * Hook for managing TTS audio generation for a single text field
 *
 * @example
 * const { generateAudio, playAudio, hasAudio } = useAudioGeneration({
 *   language: 'en',
 *   text: instructionText,
 *   existingAudioUrl: activity.instruction.audio_url
 * });
 */
export function useAudioGeneration({
  language,
  text,
  existingAudioUrl: initialAudioUrl,
  letter,
  voiceId,
}: UseAudioGenerationProps): UseAudioGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<AudioBlob | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(initialAudioUrl || null);

  // Update existing audio URL when prop changes
  useEffect(() => {
    setExistingAudioUrl(initialAudioUrl || null);
  }, [initialAudioUrl]);

  // Cleanup blob URLs on unmount or when blob changes
  useEffect(() => {
    return () => {
      if (generatedAudioBlob?.blobUrl) {
        URL.revokeObjectURL(generatedAudioBlob.blobUrl);
      }
    };
  }, [generatedAudioBlob]);

  /**
   * Generate audio from text using TTS API
   */
  const generateAudio = useCallback(async () => {
    if (!text.trim()) {
      toast.error(`Please enter ${language === 'en' ? 'English' : 'Arabic'} text first`);
      return;
    }

    setIsGenerating(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please log in.');
      }

      const token = session.access_token;

      // Resolve template placeholders before sending to TTS
      const resolvedText = resolveTemplateText(text, letter);

      const { getEnvironmentBaseUrl, getEdgeFunctionAuthHeaders } = await import('@/lib/supabase/client');
      const response = await fetch(`${getEnvironmentBaseUrl()}/functions/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getEdgeFunctionAuthHeaders(token),
        },
        body: JSON.stringify({
          text: resolvedText,
          language,
          voice_id: voiceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }

      const responseData = await response.json();
      const data = responseData.data || responseData; // Handle both wrapped and unwrapped responses

      // Convert base64 to blob
      const binaryString = atob(data.audio_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.content_type });
      const blobUrl = URL.createObjectURL(blob);

      // Clean up old blob URL if exists
      if (generatedAudioBlob?.blobUrl) {
        URL.revokeObjectURL(generatedAudioBlob.blobUrl);
      }

      setGeneratedAudioBlob({
        blob,
        blobUrl,
        filePath: data.suggested_file_path,
      });
      setExistingAudioUrl(null); // Clear existing URL when generating new audio
      toast.success('Audio generated successfully!');

    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  }, [text, language, letter, voiceId, generatedAudioBlob?.blobUrl]);

  /**
   * Play the generated or existing audio
   */
  const playAudio = useCallback(() => {
    const audioUrl = generatedAudioBlob?.blobUrl || existingAudioUrl;
    if (audioUrl) {
      const audio = new Audio(audioUrl);

      // Set playing state when audio starts
      setIsPlaying(true);

      // Reset playing state when audio ends
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      // Reset playing state on error
      audio.addEventListener('error', () => {
        setIsPlaying(false);
      });

      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio');
        setIsPlaying(false);
      });
    }
  }, [generatedAudioBlob?.blobUrl, existingAudioUrl]);

  /**
   * Clear generated audio (keeps existing audio URL)
   */
  const clearAudio = useCallback(() => {
    if (generatedAudioBlob?.blobUrl) {
      URL.revokeObjectURL(generatedAudioBlob.blobUrl);
    }
    setGeneratedAudioBlob(null);
  }, [generatedAudioBlob?.blobUrl]);

  const hasAudio = !!(generatedAudioBlob || existingAudioUrl);

  return {
    isGenerating,
    isPlaying,
    generatedAudioBlob,
    existingAudioUrl,
    generateAudio,
    playAudio,
    clearAudio,
    hasAudio,
  };
}
