"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveNodeRole } from "@/lib/hooks/useRollup";
import { NODE_ROLES, type NodeRole } from "@/lib/schemas/curriculum";
import { STORY_NODE_TYPE, storyNodeErrorText } from "@/lib/books/storyNode";
import { StoryBookPicker } from "./StoryBookPicker";

type NodeType = NodeRole | typeof STORY_NODE_TYPE;
const NODE_TYPES: readonly NodeType[] = [...NODE_ROLES, STORY_NODE_TYPE];

const ROLE_TEXT: Record<NodeType, { label: string; hint: string }> = {
  intro: { label: "Intro", hint: "Meets the new letter or rule" },
  lesson: { label: "Lesson", hint: "Teaches it" },
  practice: { label: "Practice", hint: "Practises what the lesson taught" },
  review: { label: "Review", hint: "Revisits earlier topics" },
  boss: { label: "Boss", hint: "The topic's final challenge" },
  story: { label: "Story", hint: "Opens a storybook instead of activities" },
};

const isNodeType = (v: unknown): v is NodeType =>
  typeof v === "string" && (NODE_TYPES as readonly string[]).includes(v);

interface NodeRolePanelProps {
  curriculumId: string;
  topicId: string;
  nodeId: string;
  nodeTitle: string;
  /** The node's stored `type`; older values (`assessment`) show as unset. */
  type: string | undefined;
  /** The book a story node opens (CM-B36). */
  bookId?: string | null;
  /** How many activities the node holds; a node with activities cannot become a story. */
  activityCount: number;
}

/**
 * A node's page in the form pane: its role (the node `type`), or a story node
 * and the book it opens (CM-B36). Remount per node.
 */
export function NodeRolePanel({
  curriculumId,
  topicId,
  nodeId,
  nodeTitle,
  type,
  bookId: storedBookId = null,
  activityCount,
}: NodeRolePanelProps) {
  const save = useSaveNodeRole();
  const stored = isNodeType(type) ? type : null;
  const [role, setRole] = React.useState<NodeType | null>(stored);
  const [bookId, setBookId] = React.useState<string | null>(storedBookId);
  const isStory = role === STORY_NODE_TYPE;
  const dirty = role !== null && (role !== stored || (isStory && bookId !== storedBookId));
  const canSave = dirty && (!isStory || !!bookId);
  const storyError = storyNodeErrorText(save.error);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Node</p>
          <h2 className="font-semibold">{nodeTitle}</h2>
        </div>
        <Button
          size="sm"
          disabled={!canSave || save.isPending}
          onClick={() =>
            role && save.mutate({ curriculumId, topicId, nodeId, role, bookId: isStory ? bookId : null })
          }
        >
          {save.isPending ? "Saving…" : isStory ? "Save story" : "Save role"}
        </Button>
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h4 className="text-sm font-medium">Role</h4>
          <p className="text-xs text-muted-foreground">What this node does in its topic.</p>
        </div>
        <Select value={role ?? undefined} onValueChange={(v) => isNodeType(v) && setRole(v)}>
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder={type ? `Not set (stored as ${type})` : "Not set"} />
          </SelectTrigger>
          <SelectContent>
            {NODE_TYPES.map((r) => (
              <SelectItem
                key={r}
                value={r}
                disabled={r === STORY_NODE_TYPE && stored !== STORY_NODE_TYPE && activityCount > 0}
              >
                {ROLE_TEXT[r].label}: {ROLE_TEXT[r].hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stored !== STORY_NODE_TYPE && activityCount > 0 && (
          <p className="text-xs text-muted-foreground">
            A node with activities cannot be a story node.
          </p>
        )}
        {isStory ? (
          <div className="space-y-2 pt-2">
            <StoryBookPicker value={bookId} onChange={setBookId} />
            <p className="text-xs text-muted-foreground">
              A story node opens its book in the reader and holds no activities. The
              book&apos;s decodability shows in the topic and level findings.
            </p>
          </div>
        ) : (
          <p className="pt-2 text-xs text-muted-foreground">
            Select an activity to edit it.
          </p>
        )}
        {storyError && <p className="text-sm text-destructive">{storyError}</p>}
      </div>
    </div>
  );
}
