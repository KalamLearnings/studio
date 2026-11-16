/** The usage card's grouping (CM-USAGE): a word's uses by curriculum, then node, with the roles each node plays. */

import type { WordUsageItem, WordUsageRole } from '@/lib/api/wordUsage';

export interface UsageNode {
  nodeId: string;
  nodeTitle: string;
  topicTitle: string;
  /** One entry per activity in the node. */
  activities: Array<{ activityId: string; type: string; roles: WordUsageRole[] }>;
}

export interface UsageCurriculum {
  curriculumId: string;
  title: string;
  nodes: UsageNode[];
}

const ROLE_ORDER: WordUsageRole[] = ['target', 'distractor', 'exposure'];

/** Curricula and nodes in first-seen order (the backend sorts by activity); roles in a fixed order. */
export function groupUsage(items: readonly WordUsageItem[]): UsageCurriculum[] {
  const curricula = new Map<string, UsageCurriculum>();
  for (const it of items) {
    let c = curricula.get(it.curriculum_id);
    if (!c) {
      c = { curriculumId: it.curriculum_id, title: it.curriculum_title, nodes: [] };
      curricula.set(it.curriculum_id, c);
    }
    let n = c.nodes.find((x) => x.nodeId === it.node_id);
    if (!n) {
      n = { nodeId: it.node_id, nodeTitle: it.node_title, topicTitle: it.topic_title, activities: [] };
      c.nodes.push(n);
    }
    let a = n.activities.find((x) => x.activityId === it.activity_id);
    if (!a) {
      a = { activityId: it.activity_id, type: it.type, roles: [] };
      n.activities.push(a);
    }
    if (!a.roles.includes(it.role)) a.roles.push(it.role);
  }
  const out = Array.from(curricula.values());
  for (const c of out) {
    for (const n of c.nodes) for (const a of n.activities) a.roles.sort((x, y) => ROLE_ORDER.indexOf(x) - ROLE_ORDER.indexOf(y));
  }
  return out;
}

/** The builder link of a use; the drafts pane's pattern (`/curricula/:id/builder`). Null without a curriculum. */
export function builderHref(curriculumId: string): string | null {
  return curriculumId ? `/curricula/${encodeURIComponent(curriculumId)}/builder` : null;
}
