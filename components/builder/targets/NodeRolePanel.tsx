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

const ROLE_TEXT: Record<NodeRole, { label: string; hint: string }> = {
  intro: { label: "Intro", hint: "Meets the new letter or rule" },
  lesson: { label: "Lesson", hint: "Teaches it" },
  practice: { label: "Practice", hint: "Practises what the lesson taught" },
  review: { label: "Review", hint: "Revisits earlier topics" },
  boss: { label: "Boss", hint: "The topic's final challenge" },
};

const isNodeRole = (v: unknown): v is NodeRole =>
  typeof v === "string" && (NODE_ROLES as readonly string[]).includes(v);

interface NodeRolePanelProps {
  curriculumId: string;
  topicId: string;
  nodeId: string;
  nodeTitle: string;
  /** The node's stored `type`; older values (`assessment`) show as unset. */
  type: string | undefined;
}

/** A node's page in the form pane: its role (the node `type`). Remount per node. */
export function NodeRolePanel({ curriculumId, topicId, nodeId, nodeTitle, type }: NodeRolePanelProps) {
  const save = useSaveNodeRole();
  const stored = isNodeRole(type) ? type : null;
  const [role, setRole] = React.useState<NodeRole | null>(stored);
  const dirty = role !== null && role !== stored;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Node</p>
          <h2 className="font-semibold">{nodeTitle}</h2>
        </div>
        <Button
          size="sm"
          disabled={!dirty || save.isPending}
          onClick={() =>
            role && save.mutate({ curriculumId, topicId, nodeId, role })
          }
        >
          {save.isPending ? "Saving…" : "Save role"}
        </Button>
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h4 className="text-sm font-medium">Role</h4>
          <p className="text-xs text-muted-foreground">What this node does in its topic.</p>
        </div>
        <Select value={role ?? undefined} onValueChange={(v) => isNodeRole(v) && setRole(v)}>
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder={type ? `Not set (stored as ${type})` : "Not set"} />
          </SelectTrigger>
          <SelectContent>
            {NODE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_TEXT[r].label}: {ROLE_TEXT[r].hint}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="pt-2 text-xs text-muted-foreground">
          Select an activity to edit it.
        </p>
      </div>
    </div>
  );
}
