"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_FILTER_OPTIONS, type StatusFilter } from "@/lib/types/assetRegistry";

/** The registry status filter shared by the audio and image libraries. */
export function AssetStatusFilter({
  value,
  onChange,
}: {
  value: StatusFilter | undefined;
  onChange: (status: StatusFilter | undefined) => void;
}) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : (v as StatusFilter))}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        {STATUS_FILTER_OPTIONS.map(({ value: v, label }) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
