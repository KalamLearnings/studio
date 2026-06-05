"use client";

/**
 * CurriculumTree Component
 *
 * Hierarchical tree view for curriculum structure: Topics → Nodes → Activities
 * Supports drag and drop reordering using @dnd-kit
 */

import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  FileText,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

// Publish Toggle Component
function PublishToggle({
  isPublished,
  onToggle,
}: {
  isPublished: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
        isPublished ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
      )}
      title={isPublished ? "Published - click to unpublish" : "Draft - click to publish"}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform",
          isPublished ? "translate-x-3.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export interface TreeNode {
  id: string;
  type: "topic" | "node" | "activity";
  title: string;
  children?: TreeNode[];
  activityType?: string;
  isPublished?: boolean;
  parentId?: string;
}

interface CurriculumTreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  expandedIds?: Set<string>;
  onSelect: (node: TreeNode) => void;
  onToggleExpand?: (nodeId: string) => void;
  onAddTopic?: () => void;
  onAddNode?: (parentId: string) => void;
  onAddActivity?: (parentId: string) => void;
  onDelete?: (node: TreeNode) => void;
  onDuplicate?: (node: TreeNode) => void;
  onTogglePublish?: (node: TreeNode) => void;
  onReorderTopics?: (activeId: string, overId: string) => void;
  onReorderActivities?: (nodeId: string, activeId: string, overId: string) => void;
  onMoveActivity?: (activityId: string, sourceNodeId: string, targetNodeId: string) => void;
}

// Draggable Topic Component
interface DraggableTopicProps {
  node: TreeNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddNode: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onTogglePublish?: () => void;
  children: React.ReactNode;
}

function DraggableTopic({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onAddNode,
  onDuplicate,
  onDelete,
  onTogglePublish,
  children,
}: DraggableTopicProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: {
      type: "topic",
      node,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isPublished = node.isPublished !== false;

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-foreground"
        )}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand/Collapse */}
        <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        <Folder className="h-4 w-4 text-blue-500" />

        {/* Title */}
        <button
          className={cn(
            "flex-1 text-left truncate font-medium",
            !isPublished && "opacity-50"
          )}
          onClick={onSelect}
        >
          {node.title}
        </button>

        {/* Publish Toggle */}
        {onTogglePublish && (
          <div className="opacity-0 group-hover:opacity-100">
            <PublishToggle isPublished={isPublished} onToggle={onTogglePublish} />
          </div>
        )}

        {/* Add Node Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddNode();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded transition-all"
          title="Add Node"
        >
          <Plus className="h-3 w-3 text-primary" />
        </button>

        {/* Duplicate Button */}
        {onDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-all"
            title="Duplicate Topic"
          >
            <Copy className="h-3 w-3 text-green-600" />
          </button>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
            title="Delete Topic"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// Droppable Node Component
interface DroppableNodeProps {
  node: TreeNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddActivity: () => void;
  onDelete?: () => void;
  onTogglePublish?: () => void;
  children: React.ReactNode;
}

function DroppableNode({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onAddActivity,
  onDelete,
  onTogglePublish,
  children,
}: DroppableNodeProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: node.id,
    data: {
      type: "node",
      node,
    },
  });

  const isPublished = node.isPublished !== false;

  return (
    <div className="ml-4 mt-0.5">
      <div
        ref={setNodeRef}
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-foreground",
          isOver && "bg-primary/20 ring-2 ring-primary/50"
        )}
      >
        {/* Spacer for alignment */}
        <div className="w-4" />

        {/* Expand/Collapse */}
        <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        <Folder className="h-4 w-4 text-amber-500" />

        {/* Title */}
        <button
          className={cn(
            "flex-1 text-left truncate",
            !isPublished && "opacity-50"
          )}
          onClick={onSelect}
        >
          {node.title}
        </button>

        {/* Publish Toggle */}
        {onTogglePublish && (
          <div className="opacity-0 group-hover:opacity-100">
            <PublishToggle isPublished={isPublished} onToggle={onTogglePublish} />
          </div>
        )}

        {/* Add Activity Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddActivity();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded transition-all"
          title="Add Activity"
        >
          <Plus className="h-3 w-3 text-primary" />
        </button>

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
            title="Delete Node"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// Draggable Activity Component
interface DraggableActivityProps {
  node: TreeNode;
  nodeId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onTogglePublish?: () => void;
}

function DraggableActivity({
  node,
  nodeId,
  isSelected,
  onSelect,
  onDelete,
  onTogglePublish,
}: DraggableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: {
      type: "activity",
      node,
      nodeId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isPublished = node.isPublished !== false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "ml-8 group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </button>

      {/* Icon */}
      <FileText
        className={cn(
          "h-4 w-4",
          isSelected ? "text-primary-foreground" : "text-emerald-500"
        )}
      />

      {/* Title */}
      <button
        className={cn(
          "flex-1 text-left truncate text-xs",
          !isPublished && "opacity-50"
        )}
        onClick={onSelect}
      >
        {node.activityType
          ?.split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ") || node.title}
      </button>

      {/* Publish Toggle */}
      {onTogglePublish && (
        <div className="opacity-0 group-hover:opacity-100">
          <PublishToggle isPublished={isPublished} onToggle={onTogglePublish} />
        </div>
      )}

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "opacity-0 group-hover:opacity-100 p-1 rounded transition-all",
            isSelected
              ? "hover:bg-primary-foreground/20"
              : "hover:bg-destructive/10"
          )}
          title="Delete Activity"
        >
          <Trash2
            className={cn(
              "h-3 w-3",
              isSelected ? "text-primary-foreground" : "text-destructive"
            )}
          />
        </button>
      )}
    </div>
  );
}

// Drag Overlay Component
function DragOverlayContent({ node }: { node: TreeNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md shadow-lg text-sm">
      {node.type === "topic" && <Folder className="h-4 w-4 text-blue-500" />}
      {node.type === "node" && <Folder className="h-4 w-4 text-amber-500" />}
      {node.type === "activity" && <FileText className="h-4 w-4 text-emerald-500" />}
      <span className="truncate max-w-[200px]">{node.title}</span>
    </div>
  );
}

export function CurriculumTree({
  nodes,
  selectedId,
  expandedIds = new Set(),
  onSelect,
  onToggleExpand,
  onAddTopic,
  onAddNode,
  onAddActivity,
  onDelete,
  onDuplicate,
  onTogglePublish,
  onReorderTopics,
  onReorderActivities,
  onMoveActivity,
}: CurriculumTreeProps) {
  const [draggingNode, setDraggingNode] = React.useState<TreeNode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;

    if (data?.node) {
      setDraggingNode(data.node as TreeNode);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingNode(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    const isActivityDrag = activeData?.type === "activity";
    const isActivityDrop = overData?.type === "activity";
    const isNodeDrop = overData?.type === "node";
    const isTopicDrag = activeData?.type === "topic";
    const isTopicDrop = overData?.type === "topic";

    // Scenario 1: Moving activity to a different node
    if (isActivityDrag && isNodeDrop && activeData && overData) {
      const activityNode = activeData.node as TreeNode;
      const targetNodeId = over.id as string;
      const sourceNodeId = activeData.nodeId as string;

      if (targetNodeId !== sourceNodeId) {
        onMoveActivity?.(activityNode.id, sourceNodeId, targetNodeId);
      }
    }

    // Scenario 2: Reordering activities within the same node
    if (isActivityDrag && isActivityDrop && activeData && overData) {
      const activeActivityNode = activeData.node as TreeNode;
      const overActivityNode = overData.node as TreeNode;

      if (activeData.nodeId === overData.nodeId) {
        onReorderActivities?.(
          activeData.nodeId as string,
          activeActivityNode.id,
          overActivityNode.id
        );
      }
    }

    // Scenario 3: Reordering topics
    if (isTopicDrag && isTopicDrop) {
      onReorderTopics?.(active.id as string, over.id as string);
    }
  }

  // Get all activity IDs for a node (for SortableContext)
  const getActivityIds = (nodeChildren: TreeNode[] | undefined): string[] => {
    return nodeChildren?.filter((c) => c.type === "activity").map((c) => c.id) || [];
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold text-sm">Curriculum Structure</h3>
        <Button size="sm" variant="outline" onClick={onAddTopic}>
          <Plus className="h-4 w-4 mr-1" />
          Topic
        </Button>
      </div>

      {/* Tree with DnD Context */}
      <ScrollArea className="flex-1">
        <div className="py-2 px-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {nodes.length > 0 ? (
              <SortableContext
                items={nodes.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                {nodes.map((topic) => {
                  const isTopicExpanded = expandedIds.has(topic.id);
                  const topicNodes = topic.children?.filter((c) => c.type === "node") || [];

                  return (
                    <DraggableTopic
                      key={topic.id}
                      node={topic}
                      isExpanded={isTopicExpanded}
                      isSelected={selectedId === topic.id}
                      onToggle={() => onToggleExpand?.(topic.id)}
                      onSelect={() => onSelect(topic)}
                      onAddNode={() => onAddNode?.(topic.id)}
                      onDuplicate={onDuplicate ? () => onDuplicate(topic) : undefined}
                      onDelete={onDelete ? () => onDelete(topic) : undefined}
                      onTogglePublish={
                        onTogglePublish ? () => onTogglePublish(topic) : undefined
                      }
                    >
                      {/* Nodes */}
                      {isTopicExpanded &&
                        topicNodes.map((node) => {
                          const isNodeExpanded = expandedIds.has(node.id);
                          const nodeActivities = node.children || [];

                          return (
                            <DroppableNode
                              key={node.id}
                              node={node}
                              isExpanded={isNodeExpanded}
                              isSelected={selectedId === node.id}
                              onToggle={() => onToggleExpand?.(node.id)}
                              onSelect={() => onSelect(node)}
                              onAddActivity={() => onAddActivity?.(node.id)}
                              onDelete={onDelete ? () => onDelete(node) : undefined}
                              onTogglePublish={
                                onTogglePublish ? () => onTogglePublish(node) : undefined
                              }
                            >
                              {/* Activities */}
                              {isNodeExpanded && nodeActivities.length > 0 && (
                                <SortableContext
                                  items={getActivityIds(nodeActivities)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {nodeActivities
                                    .filter((a) => a.type === "activity")
                                    .map((activity) => (
                                      <DraggableActivity
                                        key={activity.id}
                                        node={activity}
                                        nodeId={node.id}
                                        isSelected={selectedId === activity.id}
                                        onSelect={() => onSelect(activity)}
                                        onDelete={
                                          onDelete ? () => onDelete(activity) : undefined
                                        }
                                        onTogglePublish={
                                          onTogglePublish
                                            ? () => onTogglePublish(activity)
                                            : undefined
                                        }
                                      />
                                    ))}
                                </SortableContext>
                              )}

                              {/* Empty state for node with no activities */}
                              {isNodeExpanded && nodeActivities.length === 0 && (
                                <div className="ml-8 px-2 py-2 text-xs text-muted-foreground">
                                  No activities yet
                                </div>
                              )}
                            </DroppableNode>
                          );
                        })}
                    </DraggableTopic>
                  );
                })}
              </SortableContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Folder className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No topics yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={onAddTopic}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Topic
                </Button>
              </div>
            )}

            {/* Drag Overlay */}
            <DragOverlay>
              {draggingNode && <DragOverlayContent node={draggingNode} />}
            </DragOverlay>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}
