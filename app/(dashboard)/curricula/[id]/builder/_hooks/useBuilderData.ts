"use client";

import * as React from "react";
import { useCurriculum } from "@/lib/hooks/useCurriculum";
import { useTopics } from "@/lib/hooks/useTopics";
import { useAllNodes } from "@/lib/hooks/useNodes";
import { useAllActivities } from "@/lib/hooks/useActivities";

export function useBuilderData(curriculumId: string) {
  const { data: curriculum, isLoading: curriculumLoading } = useCurriculum(curriculumId);
  const { data: topics, isLoading: topicsLoading } = useTopics(curriculumId);
  const { data: nodes, isLoading: nodesLoading } = useAllNodes(curriculumId);

  const nodeIds = React.useMemo(() => nodes?.map(n => n.id) || [], [nodes]);
  const { data: activities, isLoading: activitiesLoading } = useAllActivities(curriculumId, nodeIds);

  const isLoading = curriculumLoading || topicsLoading || nodesLoading || activitiesLoading;

  return {
    curriculum,
    topics,
    nodes,
    activities,
    isLoading,
  };
}
