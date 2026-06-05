"use client";

import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  FileText,
  GripVertical,
  MoreHorizontal,
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
        isPublished ? "bg-green-500" : "bg-gray-300"
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
}

interface CurriculumTreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect: (node: TreeNode) => void;
  onAddTopic?: () => void;
  onAddNode?: (parentId: string) => void;
  onAddActivity?: (parentId: string) => void;
  onDelete?: (node: TreeNode) => void;
  onTogglePublish?: (node: TreeNode) => void;
}

interface TreeItemProps {
  node: TreeNode;
  level: number;
  selectedId?: string;
  onSelect: (node: TreeNode) => void;
  onAddNode?: (parentId: string) => void;
  onAddActivity?: (parentId: string) => void;
  onDelete?: (node: TreeNode) => void;
  onTogglePublish?: (node: TreeNode) => void;
}

function TreeItem({
  node,
  level,
  selectedId,
  onSelect,
  onAddNode,
  onAddActivity,
  onDelete,
  onTogglePublish,
}: TreeItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isPublished = node.isPublished !== false;

  const getIcon = () => {
    switch (node.type) {
      case "topic":
        return <Folder className="h-4 w-4" style={{ color: "#4A90D9" }} />;
      case "node":
        return <Folder className="h-4 w-4" style={{ color: "#F5A623" }} />;
      case "activity":
        return <FileText className="h-4 w-4" style={{ color: "#34D399" }} />;
    }
  };

  const getLabel = () => {
    switch (node.type) {
      case "topic":
        return "Topic";
      case "node":
        return "Node";
      case "activity":
        return node.activityType || "Activity";
    }
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {/* Drag Handle */}
        <button className="cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100">
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand/Collapse */}
        {node.type !== "activity" ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon */}
        {getIcon()}

        {/* Title */}
        <button
          className={cn(
            "text-left truncate",
            !isPublished && "opacity-50"
          )}
          onClick={() => onSelect(node)}
        >
          {node.title}
        </button>

        {/* Publish Toggle */}
        {onTogglePublish && (
          <div className="opacity-0 group-hover:opacity-100 ml-1">
            <PublishToggle
              isPublished={isPublished}
              onToggle={() => onTogglePublish(node)}
            />
          </div>
        )}

        {/* Type Badge - only show for topics and nodes */}
        {node.type !== "activity" && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-0 group-hover:opacity-100 ml-1">
            {getLabel()}
          </span>
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {node.type === "topic" && (
              <DropdownMenuItem onClick={() => onAddNode?.(node.id)}>
                Add Node
              </DropdownMenuItem>
            )}
            {node.type === "node" && (
              <DropdownMenuItem onClick={() => onAddActivity?.(node.id)}>
                Add Activity
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(node)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddNode={onAddNode}
              onAddActivity={onAddActivity}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CurriculumTree({
  nodes,
  selectedId,
  onSelect,
  onAddTopic,
  onAddNode,
  onAddActivity,
  onDelete,
  onTogglePublish,
}: CurriculumTreeProps) {
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

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="py-2 px-1">
          {nodes.length > 0 ? (
            nodes.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddNode={onAddNode}
                onAddActivity={onAddActivity}
                onDelete={onDelete}
                onTogglePublish={onTogglePublish}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Folder className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                No topics yet
              </p>
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
        </div>
      </ScrollArea>
    </div>
  );
}
