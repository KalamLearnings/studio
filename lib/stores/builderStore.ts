/**
 * Zustand store for curriculum builder state
 * Centralizes all selection, UI, and form state
 */

import { create } from 'zustand';
import type { ArticleType } from '@/lib/schemas/curriculum';

interface FormData {
  type: ArticleType;
  instructionEn: string;
  instructionAr: string;
  config: any;
}

interface BuilderStore {
  // Selection state
  selectedTopicId: string | null;
  selectedNodeId: string | null;
  selectedActivityId: string | null;

  // UI state
  expandedTopics: Set<string>;
  expandedNodes: Set<string>;
  isCreatingNew: boolean;

  // Modal state
  topicModalOpen: boolean;
  nodeModalOpen: boolean;
  activityModalOpen: boolean;

  // Form state
  formData: FormData;

  // Selection actions
  setSelectedTopicId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedActivityId: (id: string | null) => void;

  // UI actions
  toggleTopic: (topicId: string) => void;
  toggleNode: (nodeId: string) => void;
  setIsCreatingNew: (value: boolean) => void;

  // Modal actions
  setTopicModalOpen: (open: boolean) => void;
  setNodeModalOpen: (open: boolean) => void;
  setActivityModalOpen: (open: boolean) => void;

  // Form actions
  setFormData: (data: Partial<FormData>) => void;
  resetFormData: () => void;
  updateConfig: (config: any) => void;
  updateInstructionEn: (value: string) => void;
  updateInstructionAr: (value: string) => void;

  // Combined actions
  selectActivity: (activityId: string, nodeId: string, topicId: string) => void;
  startCreatingActivity: (type: ArticleType) => void;
  addActivityToNode: (nodeId: string, topicId: string) => void;
}

const defaultFormData: FormData = {
  type: 'show_letter_or_word',
  instructionEn: '',
  instructionAr: '',
  config: {},
};

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  // Initial state
  selectedTopicId: null,
  selectedNodeId: null,
  selectedActivityId: null,
  expandedTopics: new Set(),
  expandedNodes: new Set(),
  isCreatingNew: false,
  topicModalOpen: false,
  nodeModalOpen: false,
  activityModalOpen: false,
  formData: defaultFormData,

  // Selection actions
  setSelectedTopicId: (id) => set({ selectedTopicId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedActivityId: (id) => set({ selectedActivityId: id }),

  // UI actions
  toggleTopic: (topicId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedTopics);
      if (newExpanded.has(topicId)) {
        newExpanded.delete(topicId);
      } else {
        newExpanded.add(topicId);
      }
      return { expandedTopics: newExpanded };
    }),

  toggleNode: (nodeId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return { expandedNodes: newExpanded };
    }),

  setIsCreatingNew: (value) => set({ isCreatingNew: value }),

  // Modal actions
  setTopicModalOpen: (open) => set({ topicModalOpen: open }),
  setNodeModalOpen: (open) => set({ nodeModalOpen: open }),
  setActivityModalOpen: (open) => set({ activityModalOpen: open }),

  // Form actions
  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  resetFormData: () => set({ formData: defaultFormData }),

  updateConfig: (config) =>
    set((state) => ({
      formData: { ...state.formData, config },
    })),

  updateInstructionEn: (value) =>
    set((state) => ({
      formData: { ...state.formData, instructionEn: value },
    })),

  updateInstructionAr: (value) =>
    set((state) => ({
      formData: { ...state.formData, instructionAr: value },
    })),

  // Combined actions
  selectActivity: (activityId, nodeId, topicId) => {
    set({
      selectedActivityId: activityId,
      selectedNodeId: nodeId,
      selectedTopicId: topicId,
      isCreatingNew: false,
    });

    // Auto-expand parents
    const { expandedTopics, expandedNodes } = get();
    const newExpandedTopics = new Set(expandedTopics).add(topicId);
    const newExpandedNodes = new Set(expandedNodes).add(nodeId);

    set({
      expandedTopics: newExpandedTopics,
      expandedNodes: newExpandedNodes,
    });
  },

  startCreatingActivity: (type) => {
    set({
      isCreatingNew: true,
      selectedActivityId: null,
      formData: {
        type,
        instructionEn: '',
        instructionAr: '',
        config: {},
      },
    });
  },

  addActivityToNode: (nodeId, topicId) => {
    set({
      selectedNodeId: nodeId,
      selectedTopicId: topicId,
      activityModalOpen: true,
    });
  },
}));
