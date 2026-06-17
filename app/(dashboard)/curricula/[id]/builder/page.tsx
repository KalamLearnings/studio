"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ActivityTypePicker } from "@/components/builder/activity-type-picker";
import { LetterSelectorModal } from "@/components/builder/letter-selector-modal";
import {
  useBuilderData,
  useTreeState,
  useBuilderActions,
  useResizablePanel,
} from "./_hooks";
import {
  BuilderHeader,
  TreePanel,
  FormPanel,
  PreviewPanel,
} from "./_components";

const TREE_WIDTH_KEY = "kalam-builder-tree-width";
const DEFAULT_TREE_WIDTH = 280;
const MIN_TREE_WIDTH = 200;
const MAX_TREE_WIDTH = 500;

export default function BuilderPage() {
  const params = useParams();
  const curriculumId = params.id as string;

  // Data fetching
  const { curriculum, topics, nodes, activities, isLoading } = useBuilderData(curriculumId);

  // Tree state management
  const {
    selectedNode,
    expandedIds,
    isAllExpanded,
    newActivity,
    currentTopic,
    tree,
    setSelectedNode,
    handleToggleExpand,
    handleToggleExpandAll,
    setNewActivity,
    clearSelection,
  } = useTreeState({ topics, nodes, activities });

  // Resizable panel
  const { width: treeWidth, isResizing, handleMouseDown } = useResizablePanel({
    storageKey: TREE_WIDTH_KEY,
    defaultWidth: DEFAULT_TREE_WIDTH,
    minWidth: MIN_TREE_WIDTH,
    maxWidth: MAX_TREE_WIDTH,
  });

  // Actions (mutations and modal handlers)
  const {
    activityPickerOpen,
    setActivityPickerOpen,
    letterSelectorOpen,
    setLetterSelectorOpen,
    handleAddTopic,
    handleLetterSelect,
    handleAddNode,
    handleAddActivity,
    handleSelectActivityType,
    handleSaveNewActivity,
    handleCancelNewActivity,
    handleTogglePublish,
    handleDelete,
  } = useBuilderActions({
    curriculumId,
    topics,
    nodes,
    activities,
    selectedNode,
    clearSelection,
    setNewActivity,
  });

  // Open an activity in the form pane by pasting its ID (Phase 1: current curriculum).
  const [activitySearchId, setActivitySearchId] = useState("");

  const handleOpenActivityById = () => {
    const id = activitySearchId.trim();
    if (!id) return;

    const activity = activities?.find((a) => a.id === id);
    if (!activity) {
      toast.error("Activity not found in this curriculum");
      return;
    }

    // Activity carries node_id; derive the topic that owns that node.
    const topicId = nodes?.find((n) => n.id === activity.node_id)?.topic_id ?? null;
    if (!topicId) {
      toast.error("Could not locate the topic for this activity");
      return;
    }

    // Reuse the existing selection flow: select the activity's tree node and
    // expand its ancestors so it's visible in the tree.
    const treeNode = tree
      .flatMap((topic) => topic.children ?? [])
      .flatMap((node) => node.children ?? [])
      .find((a) => a.id === activity.id);
    if (!treeNode) {
      toast.error("Activity not found in this curriculum");
      return;
    }

    setSelectedNode(treeNode);
    if (!expandedIds.has(topicId)) handleToggleExpand(topicId);
    if (!expandedIds.has(activity.node_id)) handleToggleExpand(activity.node_id);
    setActivitySearchId("");
  };

  // Determine what to show in the form panel
  const formActivityType = newActivity
    ? newActivity.type
    : selectedNode?.type === "activity"
    ? selectedNode.activityType
    : undefined;

  // The currently selected activity, used for the Reference IDs in the preview.
  const selectedActivity =
    selectedNode?.type === "activity"
      ? activities?.find((a) => a.id === selectedNode.id)
      : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-6">
      <BuilderHeader
        title={curriculum?.title?.en || "Loading..."}
        topicCount={topics?.length || 0}
        activityCount={activities?.length || 0}
        activitySearchId={activitySearchId}
        onActivitySearchIdChange={setActivitySearchId}
        onOpenActivityById={handleOpenActivityById}
      />

      <div className="flex flex-1 overflow-hidden">
        <TreePanel
          width={treeWidth}
          isResizing={isResizing}
          isLoading={isLoading}
          tree={tree}
          selectedId={selectedNode?.id}
          expandedIds={expandedIds}
          isAllExpanded={isAllExpanded}
          onMouseDown={handleMouseDown}
          onSelect={setSelectedNode}
          onToggleExpand={handleToggleExpand}
          onToggleExpandAll={handleToggleExpandAll}
          onAddTopic={handleAddTopic}
          onAddNode={handleAddNode}
          onAddActivity={handleAddActivity}
          onTogglePublish={handleTogglePublish}
          onDelete={handleDelete}
        />

        <FormPanel
          activityType={formActivityType}
          topic={currentTopic}
          isNew={!!newActivity}
          onSave={
            newActivity
              ? (data) => handleSaveNewActivity(newActivity, data)
              : undefined
          }
          onCancel={newActivity ? handleCancelNewActivity : undefined}
        />

        <PreviewPanel
          activityType={selectedNode?.type === "activity" ? selectedNode.activityType : undefined}
          title={selectedNode?.type === "activity" ? selectedNode.title : undefined}
          topicId={selectedActivity ? currentTopic?.id : undefined}
          nodeId={selectedActivity?.node_id}
          activityId={selectedActivity?.id}
        />
      </div>

      <ActivityTypePicker
        open={activityPickerOpen}
        onOpenChange={setActivityPickerOpen}
        onSelect={handleSelectActivityType}
      />

      <LetterSelectorModal
        open={letterSelectorOpen}
        onOpenChange={setLetterSelectorOpen}
        onSelect={handleLetterSelect}
      />
    </div>
  );
}
