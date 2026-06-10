"use client";

import {
  PhonePreview,
  ActivityPreview,
} from "@/components/builder/phone-preview";

interface PreviewPanelProps {
  activityType?: string;
  title?: string;
}

export function PreviewPanel({ activityType, title }: PreviewPanelProps) {
  return (
    <div className="w-80 border-l bg-muted/30 flex-shrink-0 overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="border-b p-3">
          <h3 className="font-semibold text-sm">Live Preview</h3>
        </div>
        <div className="flex-1 overflow-auto">
          <PhonePreview>
            {activityType && (
              <ActivityPreview activityType={activityType} title={title} />
            )}
          </PhonePreview>
        </div>
      </div>
    </div>
  );
}
