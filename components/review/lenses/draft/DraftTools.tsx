"use client";

/**
 * The drafts lens tools (CW-7): narrow the drafts to a curriculum or a node
 * (every curriculum by default, BE-1), and request drafts for the node picked.
 */

import { useCurricula } from "@/lib/hooks/useCurriculum";
import { useAllNodes } from "@/lib/hooks/useNodes";
import { useDraftScope } from "@/lib/hooks/useReviewDraftPhraseSources";
import type { InboxItem } from "@/lib/review/inbox";
import { RequestDrafts } from "./RequestDrafts";

const SELECT = "h-[30px] min-w-0 flex-1 rounded-md border bg-background px-1.5 text-xs";

export function DraftTools(_props: { items: InboxItem[] }) {
  const { curriculumId, nodeId, setCurriculum, setNode } = useDraftScope();
  const { data: curricula } = useCurricula();
  const { data: nodes } = useAllNodes(curriculumId);

  return (
    <div className="grid gap-1.5">
      <div className="flex min-w-0 gap-1.5">
        <select aria-label="Curriculum" value={curriculumId} onChange={(e) => setCurriculum(e.target.value)} className={SELECT}>
          <option value="">Every curriculum</option>
          {(curricula ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title.en}
            </option>
          ))}
        </select>
        <select
          aria-label="Node"
          value={nodeId}
          onChange={(e) => setNode(e.target.value)}
          className={SELECT}
          disabled={!curriculumId}
          title={curriculumId ? undefined : "Pick a curriculum first"}
        >
          <option value="">Every node</option>
          {(nodes ?? []).map((n) => (
            <option key={n.id} value={n.id}>
              {n.title.en}
            </option>
          ))}
        </select>
      </div>
      <RequestDrafts nodeId={nodeId} label="Request drafts" />
    </div>
  );
}
