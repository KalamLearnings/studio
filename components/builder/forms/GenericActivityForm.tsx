"use client";

import * as React from "react";
import type { BaseActivityFormProps } from "./types";

/**
 * Generic fallback form for activities without specific configuration.
 * Shows a simple message - no JSON editor needed.
 */
export function GenericActivityForm({}: BaseActivityFormProps) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <p className="text-sm text-muted-foreground">
        No additional configuration needed for this activity type.
      </p>
    </div>
  );
}
