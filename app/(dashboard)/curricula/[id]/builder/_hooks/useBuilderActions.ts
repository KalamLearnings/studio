"use client";

import * as React from "react";
import type { TreeNode } from "@/components/builder/curriculum-tree";
import type { Letter } from "@/lib/hooks/useLetters";
import type { LetterForm, TopicType } from "@/components/builder/letter-selector-modal";
import type { Topic, Node, Article, ActivityTemplate } from "@/lib/schemas/curriculum";
import {
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from "@/lib/hooks/useTopics";
import {
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
} from "@/lib/hooks/useNodes";
import {
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from "@/lib/hooks/useActivities";
import { useInstantiateTemplate } from "@/lib/hooks/useTemplates";
import type { NewActivityState } from "./useTreeState";

interface UseBuilderActionsOptions {
  curriculumId: string;
  topics: Topic[] | undefined;
  nodes: Node[] | undefined;
  activities: Article[] | undefined;
  selectedNode: TreeNode | null;
  clearSelection: () => void;
  setNewActivity: (activity: NewActivityState | null) => void;
}

export function useBuilderActions({
  curriculumId,
  topics,
  nodes,
  activities,
  selectedNode,
  clearSelection,
  setNewActivity,
}: UseBuilderActionsOptions) {
  // Mutations
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const deleteNode = useDeleteNode();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const instantiateTemplate = useInstantiateTemplate();

  // Modal state
  const [activityPickerOpen, setActivityPickerOpen] = React.useState(false);
  const [letterSelectorOpen, setLetterSelectorOpen] = React.useState(false);
  const [pendingParentId, setPendingParentId] = React.useState<string | null>(null);
  const [pendingTopicId, setPendingTopicId] = React.useState<string | null>(null);

  // Topic actions
  const handleAddTopic = React.useCallback(() => {
    setLetterSelectorOpen(true);
  }, []);

  const handleLetterSelect = React.useCallback(
    (letter: Letter | null, form: LetterForm, topicType: TopicType, topicName?: string) => {
      const title = letter
        ? `Letter ${letter.name_english} (${letter.letter})`
        : topicName || `New ${topicType.charAt(0).toUpperCase() + topicType.slice(1)}`;

      const nextSequence = (topics?.length || 0) + 1;

      createTopic.mutate({
        curriculumId,
        data: {
          title: { en: title },
          letter_id: letter?.id,
          letter_form: letter ? form : undefined,
          type: topicType,
          sequence_number: nextSequence,
        },
      });
    },
    [curriculumId, topics, createTopic]
  );

  // Node actions
  const handleAddNode = React.useCallback(
    (parentId: string) => {
      const topicNodes = nodes?.filter(n => n.topic_id === parentId) || [];
      const nextSequence = topicNodes.length + 1;

      createNode.mutate({
        curriculumId,
        topicId: parentId,
        data: {
          title: { en: "New Node" },
          type: "lesson",
          sequence_number: nextSequence,
        },
      });
    },
    [curriculumId, nodes, createNode]
  );

  // Activity actions
  const handleAddActivity = React.useCallback(
    (parentId: string) => {
      const node = nodes?.find(n => n.id === parentId);
      if (node) {
        setPendingTopicId(node.topic_id);
      }
      setPendingParentId(parentId);
      setActivityPickerOpen(true);
    },
    [nodes]
  );

  const handleSelectActivityType = React.useCallback(
    (type: { id: string; name: string }) => {
      if (!pendingParentId || !pendingTopicId) return;

      setNewActivity({
        type: type.id,
        name: type.name,
        nodeId: pendingParentId,
        topicId: pendingTopicId,
      });

      clearSelection();
      setPendingParentId(null);
      setPendingTopicId(null);
    },
    [pendingParentId, pendingTopicId, setNewActivity, clearSelection]
  );

  const handleSelectTemplate = React.useCallback(
    (template: ActivityTemplate, variables: Record<string, string>) => {
      if (!pendingParentId) return;

      instantiateTemplate.mutate({
        template_id: template.id,
        variables,
        node_id: pendingParentId,
      });

      setPendingParentId(null);
      setPendingTopicId(null);
    },
    [pendingParentId, instantiateTemplate]
  );

  const handleSaveNewActivity = React.useCallback(
    (newActivity: NewActivityState, data: Record<string, unknown>) => {
      createActivity.mutate({
        curriculumId,
        nodeId: newActivity.nodeId,
        data: {
          type: newActivity.type as any,
          instruction: data.instruction
            ? { en: data.instruction as string }
            : { en: newActivity.name },
          config: (data.config || {}) as any,
        },
      });

      setNewActivity(null);
    },
    [curriculumId, createActivity, setNewActivity]
  );

  const handleCancelNewActivity = React.useCallback(() => {
    setNewActivity(null);
  }, [setNewActivity]);

  // Publish toggle
  const handleTogglePublish = React.useCallback(
    (targetNode: TreeNode) => {
      const newPublishState = !targetNode.isPublished;

      if (targetNode.type === "topic") {
        const topic = topics?.find(t => t.id === targetNode.id);
        if (topic) {
          updateTopic.mutate({
            curriculumId,
            topicId: topic.id,
            data: { is_published: newPublishState },
          });
        }
      } else if (targetNode.type === "node") {
        const node = nodes?.find(n => n.id === targetNode.id);
        if (node) {
          updateNode.mutate({
            curriculumId,
            topicId: node.topic_id,
            nodeId: node.id,
            data: { is_published: newPublishState },
          });
        }
      } else if (targetNode.type === "activity") {
        const activity = activities?.find(a => a.id === targetNode.id);
        if (activity) {
          updateActivity.mutate({
            curriculumId,
            nodeId: activity.node_id,
            activityId: activity.id,
            data: { is_published: newPublishState },
          });
        }
      }
    },
    [curriculumId, topics, nodes, activities, updateTopic, updateNode, updateActivity]
  );

  // Delete
  const handleDelete = React.useCallback(
    (targetNode: TreeNode) => {
      const confirmMessage = `Are you sure you want to delete this ${targetNode.type}?${
        targetNode.type === "topic"
          ? " This will also delete all nodes and activities within it."
          : targetNode.type === "node"
          ? " This will also delete all activities within it."
          : ""
      }`;

      if (!confirm(confirmMessage)) return;

      if (targetNode.type === "topic") {
        deleteTopic.mutate({ curriculumId, topicId: targetNode.id });
      } else if (targetNode.type === "node") {
        const node = nodes?.find(n => n.id === targetNode.id);
        if (node) {
          deleteNode.mutate({ curriculumId, topicId: node.topic_id, nodeId: node.id });
        }
      } else if (targetNode.type === "activity") {
        const activity = activities?.find(a => a.id === targetNode.id);
        if (activity) {
          deleteActivity.mutate({
            curriculumId,
            nodeId: activity.node_id,
            activityId: activity.id,
          });
        }
      }

      if (selectedNode?.id === targetNode.id) {
        clearSelection();
      }
    },
    [
      curriculumId,
      nodes,
      activities,
      selectedNode,
      clearSelection,
      deleteTopic,
      deleteNode,
      deleteActivity,
    ]
  );

  return {
    // Modal state
    activityPickerOpen,
    setActivityPickerOpen,
    letterSelectorOpen,
    setLetterSelectorOpen,
    // Actions
    handleAddTopic,
    handleLetterSelect,
    handleAddNode,
    handleAddActivity,
    handleSelectActivityType,
    handleSelectTemplate,
    handleSaveNewActivity,
    handleCancelNewActivity,
    handleTogglePublish,
    handleDelete,
  };
}
