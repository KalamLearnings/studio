"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { CurriculumTree, type TreeNode } from "@/components/builder/curriculum-tree";

interface TreePanelProps {
  width: number;
  isResizing: boolean;
  isLoading: boolean;
  tree: TreeNode[];
  selectedId?: string;
  expandedIds: Set<string>;
  isAllExpanded: boolean;
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
      className="border-r bg-muted/30 flex-shrink-0 relative"
      style={{ width }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
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
      )}
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
