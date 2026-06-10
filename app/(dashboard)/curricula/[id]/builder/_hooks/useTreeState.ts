"use client";

import * as React from "react";
import type { TreeNode } from "@/components/builder/curriculum-tree";
import type { Topic, Node, Article } from "@/lib/schemas/curriculum";

interface UseTreeStateOptions {
  topics: Topic[] | undefined;
  nodes: Node[] | undefined;
  activities: Article[] | undefined;
}

interface NewActivityState {
  type: string;
  name: string;
  nodeId: string;
  topicId: string;
}

export function useTreeState({ topics, nodes, activities }: UseTreeStateOptions) {
  const [selectedNode, setSelectedNode] = React.useState<TreeNode | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [newActivity, setNewActivity] = React.useState<NewActivityState | null>(null);

  // Toggle expansion of a single node
  const handleToggleExpand = React.useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Check if all expandable items are expanded
  const isAllExpanded = React.useMemo(() => {
    if (!topics?.length) return false;
    const allExpandableIds = [
      ...(topics?.map(t => t.id) || []),
      ...(nodes?.map(n => n.id) || []),
    ];
    return allExpandableIds.length > 0 && allExpandableIds.every(id => expandedIds.has(id));
  }, [topics, nodes, expandedIds]);

  // Toggle expand/collapse all
  const handleToggleExpandAll = React.useCallback(() => {
    if (isAllExpanded) {
      setExpandedIds(new Set());
    } else {
      const allIds = new Set<string>();
      topics?.forEach(t => allIds.add(t.id));
      nodes?.forEach(n => allIds.add(n.id));
      setExpandedIds(allIds);
    }
  }, [isAllExpanded, topics, nodes]);

  // Get current topic for the selected activity
  const currentTopic = React.useMemo(() => {
    if (newActivity) {
      return topics?.find(t => t.id === newActivity.topicId) || null;
    }
    if (selectedNode?.type === "activity") {
      const activity = activities?.find(a => a.id === selectedNode.id);
      if (activity) {
        const node = nodes?.find(n => n.id === activity.node_id);
        if (node) {
          return topics?.find(t => t.id === node.topic_id) || null;
        }
      }
    }
    return null;
  }, [newActivity, selectedNode, topics, nodes, activities]);

  // Build tree structure from API data
  const tree: TreeNode[] = React.useMemo(() => {
    if (!topics) return [];

    return topics.map((topic): TreeNode => {
      const topicNodes = nodes?.filter(n => n.topic_id === topic.id) || [];

      return {
        id: topic.id,
        type: "topic",
        title: topic.title?.en || "Untitled Topic",
        isPublished: topic.is_published !== false,
        children: topicNodes.map((node): TreeNode => {
          const nodeActivities = activities?.filter(a => a.node_id === node.id) || [];

          return {
            id: node.id,
            type: "node",
            title: node.title?.en || "Untitled Node",
            isPublished: node.is_published !== false,
            children: nodeActivities.map((activity): TreeNode => ({
              id: activity.id,
              type: "activity",
              title: activity.type
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
              activityType: activity.type,
              isPublished: activity.is_published !== false,
            })),
          };
        }),
      };
    });
  }, [topics, nodes, activities]);

  // Clear selection if the selected node was deleted
  const clearSelection = React.useCallback(() => {
    setSelectedNode(null);
  }, []);

  return {
    // State
    selectedNode,
    expandedIds,
    isAllExpanded,
    newActivity,
    currentTopic,
    tree,
    // Actions
    setSelectedNode,
    handleToggleExpand,
    handleToggleExpandAll,
    setNewActivity,
    clearSelection,
  };
}

export type { NewActivityState };
