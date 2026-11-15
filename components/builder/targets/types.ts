import type { DescribeContext } from "@/lib/teachingTargets/findings";
import type { LetterLookup } from "@/lib/teachingTargets/units";
import type { ActivityLabel } from "./FindingsPanel";

/** What the target and findings panels need from the builder page. */
export interface IntentContext {
  curriculumId: string;
  letterLookup?: LetterLookup;
  describe: DescribeContext;
  activityLabel: (id: string) => ActivityLabel | undefined;
  onOpenActivity: (id: string) => void;
  scopeName: (scopeType: "curriculum" | "topic", scopeId: string) => string;
  /** A node's title by id (story decodability, CM-S11). */
  nodeTitle: (nodeId: string) => string | undefined;
}
