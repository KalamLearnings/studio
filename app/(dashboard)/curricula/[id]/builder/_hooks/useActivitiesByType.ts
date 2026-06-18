import * as React from "react";
import type { Article, Node, Topic } from "@/lib/schemas/curriculum";

/** An activity enriched with the topic + node it lives under. */
export interface ActivityWithContext {
  activity: Article;
  topic: Topic | null;
  node: Node | null;
}

/** All activities of one type, with their location context. */
export interface ActivityTypeGroup {
  type: string;
  count: number;
  items: ActivityWithContext[];
}

/**
 * Group a curriculum's activities by their type, attaching each activity's
 * owning topic + node for display. Pure client-side derivation from data the
 * builder already loads — no extra fetch.
 */
export function useActivitiesByType(
  activities: Article[] | undefined,
  nodes: Node[] | undefined,
  topics: Topic[] | undefined,
): ActivityTypeGroup[] {
  return React.useMemo(() => {
    if (!activities?.length) return [];

    const nodeById = new Map((nodes ?? []).map((n) => [n.id, n]));
    const topicById = new Map((topics ?? []).map((t) => [t.id, t]));

    const groups = new Map<string, ActivityWithContext[]>();
    for (const activity of activities) {
      const node = nodeById.get(activity.node_id) ?? null;
      const topic = node ? topicById.get(node.topic_id) ?? null : null;
      const list = groups.get(activity.type) ?? [];
      list.push({ activity, topic, node });
      groups.set(activity.type, list);
    }

    return Array.from(groups.entries())
      .map(([type, items]) => ({ type, count: items.length, items }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [activities, nodes, topics]);
}
