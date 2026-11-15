"use client";

import * as React from "react";
import { useCurricula } from "@/lib/hooks/useCurriculum";
import { useLetters } from "@/lib/hooks/useLetters";
import type { IntentContext } from "@/components/builder/targets";
import type { Article, Node, Topic } from "@/lib/schemas/curriculum";

const humanize = (type: string) =>
  type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

interface UseIntentContextOptions {
  curriculumId: string;
  topics: Topic[] | undefined;
  nodes: Node[] | undefined;
  activities: Article[] | undefined;
  onOpenActivity: (id: string) => void;
}

/**
 * What the topic and level target panels read from the builder: activity
 * labels (type and place) for the findings, letter names for unit keys, and
 * level titles for the sequence findings (CM-S8).
 */
export function useIntentContext({
  curriculumId,
  topics,
  nodes,
  activities,
  onOpenActivity,
}: UseIntentContextOptions): IntentContext {
  const { getLetter } = useLetters();
  const { data: levels } = useCurricula();

  return React.useMemo(() => {
    const topicById = new Map((topics ?? []).map((t) => [t.id, t]));
    const nodeById = new Map((nodes ?? []).map((n) => [n.id, n]));
    const activityById = new Map((activities ?? []).map((a) => [a.id, a]));
    const letterLookup = (id: string) => {
      const l = getLetter(id);
      return l ? { char: l.letter, name: l.name_english } : undefined;
    };
    return {
      curriculumId,
      letterLookup,
      describe: {
        letter: letterLookup,
        levelTitle: (id: string) => levels?.find((l) => l.id === id)?.title?.en,
      },
      activityLabel: (id: string) => {
        const a = activityById.get(id);
        if (!a) return undefined;
        const node = nodeById.get(a.node_id);
        const topic = node ? topicById.get(node.topic_id) : undefined;
        const where = [topic?.title?.en, node?.title?.en].filter(Boolean).join(" · ");
        return { title: humanize(a.type), where: where || undefined };
      },
      onOpenActivity,
      scopeName: (scopeType, scopeId) =>
        scopeType === "curriculum"
          ? "This level"
          : `Topic: ${topicById.get(scopeId)?.title?.en ?? scopeId}`,
    };
  }, [curriculumId, topics, nodes, activities, levels, getLetter, onOpenActivity]);
}
