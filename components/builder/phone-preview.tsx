"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Intrinsic footprint of the phone frame (body + 12px border on each side).
const PHONE_WIDTH = 280 + 24;
const PHONE_HEIGHT = 600 + 24;

interface PhonePreviewProps {
  children?: React.ReactNode;
  className?: string;
  /** When set, the phone fills/fits its container while keeping aspect ratio. */
  fit?: boolean;
}

export function PhonePreview({ children, className, fit = false }: PhonePreviewProps) {
  const [scale, setScale] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Scale the phone down so the whole device fits the available space.
  React.useLayoutEffect(() => {
    if (!fit) return;
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // Leave a little breathing room so the frame never touches the edges.
      const next = Math.min(width / PHONE_WIDTH, height / PHONE_HEIGHT, 1) * 0.96;
      setScale(next > 0 ? next : 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  if (fit) {
    return (
      <div
        ref={containerRef}
        className={cn("flex h-full w-full items-center justify-center overflow-hidden p-2", className)}
      >
        {/* Reserve the scaled footprint so flex centering stays correct. */}
        <div style={{ width: PHONE_WIDTH * scale, height: PHONE_HEIGHT * scale }}>
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <PhoneFrame>{children}</PhoneFrame>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <PhoneFrame>{children}</PhoneFrame>
    </div>
  );
}

function PhoneFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative">
        {/* Phone Body */}
        <div className="relative h-[600px] w-[280px] rounded-[40px] border-[12px] border-gray-800 bg-gray-800 shadow-xl dark:border-gray-700">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-gray-800 dark:bg-gray-700" />

          {/* Screen */}
          <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-white dark:bg-gray-900">
            {/* Status Bar */}
            <div className="flex h-10 items-center justify-between bg-primary px-4 pt-2 text-primary-foreground">
              <span className="text-xs font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="h-2.5 w-4 rounded-sm border border-current">
                  <div className="h-full w-3/4 rounded-sm bg-current" />
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="h-[calc(100%-40px)] overflow-auto">
              {children || (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    Select an activity
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    to see a live preview
                  </p>
                </div>
              )}
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-1 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>
        </div>

        {/* Side Button */}
        <div className="absolute -right-[2px] top-28 h-12 w-[3px] rounded-r bg-gray-800 dark:bg-gray-700" />
        <div className="absolute -left-[2px] top-20 h-8 w-[3px] rounded-l bg-gray-800 dark:bg-gray-700" />
        <div className="absolute -left-[2px] top-32 h-12 w-[3px] rounded-l bg-gray-800 dark:bg-gray-700" />
        <div className="absolute -left-[2px] top-48 h-12 w-[3px] rounded-l bg-gray-800 dark:bg-gray-700" />
      </div>
  );
}

interface ActivityPreviewProps {
  activityType?: string;
  title?: string;
  instruction?: string;
}

export function ActivityPreview({
  activityType,
  title,
  instruction,
}: ActivityPreviewProps) {
  if (!activityType) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Activity Header */}
      <div className="bg-primary/10 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          {activityType.replace(/_/g, " ")}
        </p>
        {title && <h3 className="mt-1 text-lg font-bold">{title}</h3>}
      </div>

      {/* Instruction */}
      {instruction && (
        <div className="border-b p-4">
          <p className="text-sm text-muted-foreground">{instruction}</p>
        </div>
      )}

      {/* Placeholder Content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-xl bg-muted" />
          <p className="mt-4 text-xs text-muted-foreground">
            Activity content preview
          </p>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-4">
        <div className="h-12 w-full rounded-xl bg-primary/80" />
      </div>
    </div>
  );
}
