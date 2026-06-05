/**
 * TypeScript types for Audio Library
 *
 * Centralized audio asset management for curriculum sounds
 */

export type AudioCategory =
  | 'letter_sounds'
  | 'letter_names'
  | 'word_pronunciations'
  | 'instructions'
  | 'introduction'
  | 'feedback'
  | 'effects';

export interface AudioAsset {
  id: string;
  name: string;
  displayName: string;
  url: string;
  storagePath: string;
  category: AudioCategory;
  tags: string[];
  durationMs?: number;
  fileSize?: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AudioUploadData {
  displayName: string;
  category: AudioCategory;
  tags: string[];
  file: File;
  metadata?: Record<string, unknown>;
}

export const AUDIO_CATEGORIES: Record<AudioCategory, { label: string; description: string }> = {
  letter_sounds: {
    label: 'Letter Sounds',
    description: 'Pronunciation of individual Arabic letters',
  },
  letter_names: {
    label: 'Letter Names',
    description: 'Names of Arabic letters (Alif, Ba, Ta, etc.)',
  },
  word_pronunciations: {
    label: 'Word Pronunciations',
    description: 'Spoken words for vocabulary activities',
  },
  instructions: {
    label: 'Instructions',
    description: 'Activity instructions and prompts',
  },
  introduction: {
    label: 'Introduction',
    description: 'Introductory audio for lessons and topics',
  },
  feedback: {
    label: 'Feedback',
    description: 'Correct/incorrect responses and encouragement',
  },
  effects: {
    label: 'Effects',
    description: 'Sound effects for interactions and rewards',
  },
};

export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/x-m4a',
];

export const MAX_AUDIO_FILE_SIZE = 10 * 1024 * 1024; // 10MB
