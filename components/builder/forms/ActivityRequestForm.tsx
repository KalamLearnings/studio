"use client";

import * as React from "react";
import { FormField, TextArea } from "./shared";
import type { BaseActivityFormProps } from "./types";

interface ActivityRequestConfig {
  description?: string;
  notes?: string;
}

export function ActivityRequestForm({
  config,
  onChange,
}: BaseActivityFormProps<ActivityRequestConfig>) {
  const description = config?.description || "";
  const notes = config?.notes || "";

  const updateConfig = (updates: Partial<ActivityRequestConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>About Activity Requests:</strong> Use this placeholder to
          describe an activity you want built but isn&apos;t available yet. This
          helps capture requirements and ideas for future implementation.
        </p>
      </div>

      <FormField
        label="Activity Description"
        hint="Describe what the activity should do (minimum 10 characters)"
        required
      >
        <TextArea
          value={description}
          onChange={(value) => updateConfig({ description: value })}
          placeholder="Example: Students match letter sounds with pictures of objects that start with that letter..."
          rows={6}
        />
        <p className="text-xs mt-1">
          {description.length < 10 && (
            <span className="text-orange-600 dark:text-orange-400">
              {10 - description.length} more character
              {10 - description.length !== 1 ? "s" : ""} required
            </span>
          )}
          {description.length >= 10 && (
            <span className="text-green-600 dark:text-green-400">
              Description meets minimum length
            </span>
          )}
        </p>
      </FormField>

      <FormField
        label="Implementation Notes"
        hint="Additional details, requirements, or technical notes (optional)"
      >
        <TextArea
          value={notes}
          onChange={(value) => updateConfig({ notes: value })}
          placeholder="Example: Should have audio playback for each letter sound. Consider using drag-and-drop for matching..."
          rows={4}
        />
      </FormField>

      {description.length < 10 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Please provide a description of at least 10 characters
          </p>
        </div>
      )}

      {description.length >= 10 && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Activity Request Ready:</strong> This placeholder will be
            saved with your curriculum. Developers can review it when
            implementing new activities.
          </p>
        </div>
      )}
    </div>
  );
}
