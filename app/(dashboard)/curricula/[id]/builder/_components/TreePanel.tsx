"use client";

import * as React from "react";
import { Loader2, Network, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { CurriculumTree, type TreeNode } from "@/components/builder/curriculum-tree";
import { ActivitiesByTypeView } from "./ActivitiesByTypeView";
import type { ActivityTypeGroup } from "../_hooks/useActivitiesByType";

export type BuilderViewMode = "lesson" | "type";

interface TreePanelProps {
  width: number;
  isResizing: boolean;
  isLoading: boolean;
  tree: TreeNode[];
  selectedId?: string;
  expandedIds: Set<string>;
  isAllExpanded: boolean;
  viewMode: BuilderViewMode;
  onViewModeChange: (mode: BuilderViewMode) => void;
  activityGroups: ActivityTypeGroup[];
  onActivitySelect: (activityId: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: (node: TreeNode) => void;
  onToggleExpand: (nodeId: string) => void;
  onToggleExpandAll: () => void;
  onAddTopic: () => void;
  onAddNode: (parentId: string) => void;
  onAddActivity: (parentId: string) => void;
  onTogglePublish: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
}

export function TreePanel({
  width,
  isResizing,
  isLoading,
  tree,
  selectedId,
  expandedIds,
  isAllExpanded,
  viewMode,
  onViewModeChange,
  activityGroups,
  onActivitySelect,
  onMouseDown,
  onSelect,
  onToggleExpand,
  onToggleExpandAll,
  onAddTopic,
  onAddNode,
  onAddActivity,
  onTogglePublish,
  onDelete,
}: TreePanelProps) {
  return (
    <div
      className="border-r bg-muted/30 flex-shrink-0 relative flex flex-col"
      style={{ width }}
    >
      {/* View toggle: By Lesson / By Type */}
      <div className="flex gap-1 border-b p-2">
        <ViewToggleButton
          active={viewMode === "lesson"}
          onClick={() => onViewModeChange("lesson")}
          icon={<Network className="h-3.5 w-3.5" />}
          label="By Lesson"
        />
        <ViewToggleButton
          active={viewMode === "type"}
          onClick={() => onViewModeChange("type")}
          icon={<ListTree className="h-3.5 w-3.5" />}
          label="By Type"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "lesson" ? (
          <CurriculumTree
            nodes={tree}
            selectedId={selectedId}
            expandedIds={expandedIds}
            isAllExpanded={isAllExpanded}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onToggleExpandAll={onToggleExpandAll}
            onAddTopic={onAddTopic}
            onAddNode={onAddNode}
            onAddActivity={onAddActivity}
            onTogglePublish={onTogglePublish}
            onDelete={onDelete}
          />
        ) : (
          <ActivitiesByTypeView
            groups={activityGroups}
            selectedActivityId={selectedId}
            onActivitySelect={onActivitySelect}
          />
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors"
        onMouseDown={onMouseDown}
        style={{
          backgroundColor: isResizing ? "hsl(var(--primary) / 0.5)" : undefined,
        }}
      />
    </div>
  );
}

function ViewToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-background shadow-sm"
          : "text-muted-foreground hover:bg-background/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
