"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import {
  PhonePreview,
  ActivityPreview,
} from "@/components/builder/phone-preview";

interface PreviewPanelProps {
  activityType?: string;
  title?: string;
  topicId?: string;
  nodeId?: string;
  activityId?: string;
}

/** A single labeled, click-to-copy reference ID row. Renders a placeholder
 *  (and is non-interactive) when no ID is available, so the panel keeps a
 *  stable height whether or not an activity is selected. */
function IdRow({ label, id }: { label: string; id?: string }) {
  const handleCopy = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    toast.success(`${label} ID copied`);
  };

  return (
    <button
      type="button"
      disabled={!id}
      onClick={handleCopy}
      title={id ? `Click to copy ${label.toLowerCase()} ID` : undefined}
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors enabled:hover:bg-muted disabled:cursor-default"
    >
      <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
        {id ?? <span className="text-muted-foreground/40">—</span>}
      </span>
      <Copy
        className={
          id
            ? "h-3 w-3 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground"
            : "h-3 w-3 shrink-0 text-muted-foreground/20"
        }
      />
    </button>
  );
}

export function PreviewPanel({
  activityType,
  title,
  topicId,
  nodeId,
  activityId,
}: PreviewPanelProps) {
  return (
    <div className="w-80 border-l bg-muted/30 flex-shrink-0 overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="border-b p-3">
          <h3 className="font-semibold text-sm">Live Preview</h3>
        </div>
        {/* Preview region: takes the remaining height, phone scales to fit. */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <PhonePreview fit>
            {activityType && (
              <ActivityPreview activityType={activityType} title={title} />
            )}
          </PhonePreview>
        </div>

        {/* Reference IDs — fixed section, never scrolled into by the preview. */}
        <div className="shrink-0 border-t bg-background/50 p-3">
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Reference IDs
          </h4>
          <div className="space-y-0.5">
            <IdRow label="Topic" id={topicId} />
            <IdRow label="Node" id={nodeId} />
            <IdRow label="Activity" id={activityId} />
          </div>
        </div>
      </div>
    </div>
  );
}
