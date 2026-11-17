"use client";

/**
 * What a choice asks (content model 3.1, CM-B12 `prompt.kind`): the skill an
 * MCQ, a card set or match pairs practises. The server reads the skill kind
 * from it; it is not shown to children.
 */

import * as React from "react";
import { PROMPT_KIND_OPTIONS, type PromptKind } from "@/lib/activityConfig/contentItems";
import { FormField } from "./FormField";
import { useBackendCapabilities } from "@/lib/backend/useBackendCapabilities";

interface PromptKindPickerProps {
  value: PromptKind | undefined;
  onChange: (kind: PromptKind | undefined) => void;
  required?: boolean;
  hint?: string;
}

export function PromptKindPicker({
  value,
  onChange,
  required = false,
  hint = "What the activity asks: the skill it practises",
}: PromptKindPickerProps) {
  const selected = PROMPT_KIND_OPTIONS.find((o) => o.value === value);
  // PROD's backend and v1 do not read `prompt` (lib/backend/capabilities.ts); the save drops it.
  const { answerSetRefs } = useBackendCapabilities();
  if (!answerSetRefs) return null;
  return (
    <FormField label="Asks" hint={selected?.hint ?? hint} required={required} errorPath="prompt">
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || undefined) as PromptKind | undefined)}
        className="w-full max-w-xs px-3 py-2 text-sm border rounded-md bg-background focus:ring-1 focus:ring-primary"
      >
        <option value="">Not set</option>
        {PROMPT_KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
