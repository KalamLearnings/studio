"use client";

/**
 * PreviewBox Component
 *
 * Styled preview/info box with variants for displaying:
 * - Activity previews
 * - Status information
 * - Warnings or hints
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";

type PreviewVariant = "info" | "warning" | "success" | "preview";

interface PreviewBoxProps {
  variant?: PreviewVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
}

const variantStyles: Record<PreviewVariant, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  success: "bg-green-50 border-green-200 text-green-800",
  preview: "bg-muted/50 border-border text-foreground",
};

const variantIcons: Record<PreviewVariant, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  success: <CheckCircle className="h-4 w-4 text-green-600" />,
  preview: null,
};

export function PreviewBox({
  variant = "info",
  title,
  children,
  className,
  icon = true,
}: PreviewBoxProps) {
  const IconComponent = icon ? variantIcons[variant] : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        variantStyles[variant],
        className
      )}
    >
      {(title || IconComponent) && (
        <div className="flex items-center gap-2 mb-2">
          {IconComponent}
          {title && <span className="text-sm font-medium">{title}</span>}
        </div>
      )}
      <div className="text-sm">{children}</div>
    </div>
  );
}
