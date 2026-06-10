"use client";

import { useParams } from "next/navigation";
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
    handleSelectTemplate,
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

  // Determine what to show in the form panel
  const formActivityType = newActivity
    ? newActivity.type
    : selectedNode?.type === "activity"
    ? selectedNode.activityType
    : undefined;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-6">
      <BuilderHeader
        title={curriculum?.title?.en || "Loading..."}
        topicCount={topics?.length || 0}
        activityCount={activities?.length || 0}
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
        />
      </div>

      <ActivityTypePicker
        open={activityPickerOpen}
        onOpenChange={setActivityPickerOpen}
        onSelect={handleSelectActivityType}
        onSelectTemplate={handleSelectTemplate}
      />

      <LetterSelectorModal
        open={letterSelectorOpen}
        onOpenChange={setLetterSelectorOpen}
        onSelect={handleLetterSelect}
      />
    </div>
  );
}
