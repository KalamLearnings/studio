"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Settings,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CurriculumTree,
  type TreeNode,
} from "@/components/builder/curriculum-tree";
import { ActivityForm } from "@/components/builder/activity-form";
import {
  PhonePreview,
  ActivityPreview,
} from "@/components/builder/phone-preview";
import { ActivityTypePicker } from "@/components/builder/activity-type-picker";
import {
  LetterSelectorModal,
  type LetterForm,
  type TopicType,
} from "@/components/builder/letter-selector-modal";
import type { Letter } from "@/lib/hooks/useLetters";

import { useCurriculum } from "@/lib/hooks/useCurriculum";
import { useTopics, useCreateTopic, useUpdateTopic } from "@/lib/hooks/useTopics";
import { useAllNodes, useCreateNode, useUpdateNode } from "@/lib/hooks/useNodes";
import { useAllActivities, useCreateActivity, useUpdateActivity } from "@/lib/hooks/useActivities";
import { useInstantiateTemplate } from "@/lib/hooks/useTemplates";
import type { Topic, Node, Article, ActivityTemplate } from "@/lib/schemas/curriculum";

const TREE_WIDTH_KEY = "kalam-builder-tree-width";
const DEFAULT_TREE_WIDTH = 280;
const MIN_TREE_WIDTH = 200;
const MAX_TREE_WIDTH = 500;

export default function BuilderPage() {
  const params = useParams();
  const curriculumId = params.id as string;

  // Fetch data
  const { data: curriculum, isLoading: curriculumLoading } = useCurriculum(curriculumId);
  const { data: topics, isLoading: topicsLoading } = useTopics(curriculumId);
  const { data: nodes, isLoading: nodesLoading } = useAllNodes(curriculumId);

  // Get all node IDs for fetching activities
  const nodeIds = React.useMemo(() => nodes?.map(n => n.id) || [], [nodes]);
  const { data: activities, isLoading: activitiesLoading } = useAllActivities(curriculumId, nodeIds);

  // Mutations
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const instantiateTemplate = useInstantiateTemplate();

  const [selectedNode, setSelectedNode] = React.useState<TreeNode | null>(null);
  const [activityPickerOpen, setActivityPickerOpen] = React.useState(false);
  const [letterSelectorOpen, setLetterSelectorOpen] = React.useState(false);
  const [pendingParentId, setPendingParentId] = React.useState<string | null>(null);
  const [pendingTopicId, setPendingTopicId] = React.useState<string | null>(null);
  const [treeWidth, setTreeWidth] = React.useState(DEFAULT_TREE_WIDTH);
  const [isResizing, setIsResizing] = React.useState(false);

  // New activity state - when user selects a type but hasn't saved yet
  const [newActivity, setNewActivity] = React.useState<{
    type: string;
    name: string;
    nodeId: string;
    topicId: string;
  } | null>(null);

  // Get current topic for the activity form (needed for template placeholders)
  const currentTopic = React.useMemo(() => {
    // For new activity, use the pending topic ID
    if (newActivity) {
      return topics?.find(t => t.id === newActivity.topicId) || null;
    }
    // For existing activity, find topic through node
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

  // Load saved width from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem(TREE_WIDTH_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (!isNaN(width) && width >= MIN_TREE_WIDTH && width <= MAX_TREE_WIDTH) {
        setTreeWidth(width);
      }
    }
  }, []);

  // Handle resize
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(
        MAX_TREE_WIDTH,
        Math.max(MIN_TREE_WIDTH, e.clientX - 80)
      );
      setTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(TREE_WIDTH_KEY, treeWidth.toString());
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, treeWidth]);

  const handleAddActivity = (parentId: string) => {
    // Find the topic ID for this node
    const node = nodes?.find(n => n.id === parentId);
    if (node) {
      setPendingTopicId(node.topic_id);
    }
    setPendingParentId(parentId);
    setActivityPickerOpen(true);
  };

  const handleSelectActivityType = (type: { id: string; name: string }) => {
    if (!pendingParentId || !pendingTopicId) return;

    // Don't create immediately - just set up the new activity form
    setNewActivity({
      type: type.id,
      name: type.name,
      nodeId: pendingParentId,
      topicId: pendingTopicId,
    });

    // Clear the tree selection so the form shows
    setSelectedNode(null);

    setPendingParentId(null);
    setPendingTopicId(null);
  };

  // Handle template selection - creates activity immediately via backend
  const handleSelectTemplate = (template: ActivityTemplate, variables: Record<string, string>) => {
    if (!pendingParentId) return;

    instantiateTemplate.mutate({
      template_id: template.id,
      variables,
      node_id: pendingParentId,
    });

    setPendingParentId(null);
    setPendingTopicId(null);
  };

  // Handle saving a new activity
  const handleSaveNewActivity = (data: Record<string, unknown>) => {
    if (!newActivity) return;

    createActivity.mutate({
      curriculumId,
      nodeId: newActivity.nodeId,
      data: {
        type: newActivity.type as any,
        instruction: data.instruction ? { en: data.instruction as string } : { en: newActivity.name },
        config: (data.config || {}) as any,
      },
    });

    setNewActivity(null);
  };

  // Handle canceling new activity creation
  const handleCancelNewActivity = () => {
    setNewActivity(null);
  };

  const handleAddTopic = () => {
    setLetterSelectorOpen(true);
  };

  const handleLetterSelect = (letter: Letter | null, form: LetterForm, topicType: TopicType, topicName?: string) => {
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
  };

  const handleAddNode = (parentId: string) => {
    const topic = topics?.find(t => t.id === parentId);
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
  };

  const handleTogglePublish = (targetNode: TreeNode) => {
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
        const node = nodes?.find(n => n.id === activity.node_id);
        if (node) {
          updateActivity.mutate({
            curriculumId,
            nodeId: activity.node_id,
            activityId: activity.id,
            data: { is_published: newPublishState },
          });
        }
      }
    }
  };

  const isLoading = curriculumLoading || topicsLoading || nodesLoading || activitiesLoading;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-6">
      {/* Builder Header */}
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <Link href="/curricula">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">
              {curriculum?.title?.en || "Loading..."}
            </h1>
            <p className="text-xs text-muted-foreground">
              {topics?.length || 0} topics · {activities?.length || 0} activities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button size="sm">
            <Save className="h-4 w-4 mr-1" />
            Save All
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Curriculum Settings
              </DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Publish</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Tree (Resizable) */}
        <div
          className="border-r bg-muted/30 flex-shrink-0 relative"
          style={{ width: treeWidth }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CurriculumTree
              nodes={tree}
              selectedId={selectedNode?.id}
              onSelect={setSelectedNode}
              onAddTopic={handleAddTopic}
              onAddNode={handleAddNode}
              onAddActivity={handleAddActivity}
              onTogglePublish={handleTogglePublish}
            />
          )}
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors"
            onMouseDown={handleMouseDown}
            style={{
              backgroundColor: isResizing ? "hsl(var(--primary) / 0.5)" : undefined,
            }}
          />
        </div>

        {/* Center Panel - Form */}
        <div className="flex-1 overflow-hidden bg-background">
          <ActivityForm
            activityType={
              newActivity
                ? newActivity.type
                : selectedNode?.type === "activity"
                ? selectedNode.activityType
                : undefined
            }
            topic={currentTopic}
            isNew={!!newActivity}
            onSave={newActivity ? handleSaveNewActivity : undefined}
            onCancel={newActivity ? handleCancelNewActivity : undefined}
          />
        </div>

        {/* Right Panel - Preview */}
        <div className="w-80 border-l bg-muted/30 flex-shrink-0 overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="border-b p-3">
              <h3 className="font-semibold text-sm">Live Preview</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <PhonePreview>
                {selectedNode?.type === "activity" && (
                  <ActivityPreview
                    activityType={selectedNode.activityType}
                    title={selectedNode.title}
                  />
                )}
              </PhonePreview>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Type Picker Dialog */}
      <ActivityTypePicker
        open={activityPickerOpen}
        onOpenChange={setActivityPickerOpen}
        onSelect={handleSelectActivityType}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Letter Selector Modal for New Topic */}
      <LetterSelectorModal
        open={letterSelectorOpen}
        onOpenChange={setLetterSelectorOpen}
        onSelect={handleLetterSelect}
      />
    </div>
  );
}
