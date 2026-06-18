"use client";

import * as React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivityIcon, getActivityLabel } from "@/lib/constants/curriculum";
import type { ActivityTypeGroup } from "../_hooks/useActivitiesByType";

interface ActivitiesByTypeViewProps {
  groups: ActivityTypeGroup[];
  selectedActivityId?: string;
  onActivitySelect: (activityId: string) => void;
}

/**
 * Left-panel view that lists a curriculum's activities grouped by type
 * (collapsible sections), each activity showing an instruction preview and its
 * topic → node location. Selecting one opens it in the form via the shared
 * activity-selection flow.
 */
export function ActivitiesByTypeView({
  groups,
  selectedActivityId,
  onActivitySelect,
}: ActivitiesByTypeViewProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggle = (type: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No activities yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {groups.map((group) => (
        <ActivityTypeSection
          key={group.type}
          group={group}
          isExpanded={expanded.has(group.type)}
          onToggle={() => toggle(group.type)}
          selectedActivityId={selectedActivityId}
          onActivitySelect={onActivitySelect}
        />
      ))}
    </div>
  );
}

function ActivityTypeSection({
  group,
  isExpanded,
  onToggle,
  selectedActivityId,
  onActivitySelect,
}: {
  group: ActivityTypeGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedActivityId?: string;
  onActivitySelect: (activityId: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="text-base">{getActivityIcon(group.type)}</span>
        <span className="flex-1 truncate text-left">
          {getActivityLabel(group.type)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
          {group.count}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1">
          {group.items.map(({ activity, topic, node }) => {
            const isSelected = selectedActivityId === activity.id;
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onActivitySelect(activity.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <div className="truncate text-xs">
                  {activity.instruction?.en || "(No instruction)"}
                </div>
                <div
                  className={cn(
                    "truncate text-[10px]",
                    isSelected
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {topic?.title?.en ?? "—"} &rarr; {node?.title?.en ?? "—"}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
