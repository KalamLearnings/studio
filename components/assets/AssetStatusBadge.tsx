"use client";

import { cn } from "@/lib/utils";
import { STATUS_FILTER_OPTIONS, type RegistryStatus } from "@/lib/types/assetRegistry";

const TONE: Record<string, string> = {
  quarantined: "bg-amber-100 text-amber-800",
  orphan: "bg-slate-200 text-slate-700",
  superseded: "bg-slate-100 text-slate-600",
  broken: "bg-destructive/10 text-destructive",
  retired: "bg-slate-100 text-slate-600",
  unregistered: "bg-muted text-muted-foreground",
};

/**
 * The registry status of a library file. Active files show nothing; the rest
 * (quarantined, orphan, superseded, broken, retired, not in registry) show a pill.
 */
export function AssetStatusBadge({
  status,
  className,
}: {
  status: RegistryStatus;
  className?: string;
}) {
  if (status === "active") return null;
  const key = status ?? "unregistered";
  const label = STATUS_FILTER_OPTIONS.find((o) => o.value === key)?.label ?? key;
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-xs whitespace-nowrap", TONE[key], className)}
    >
      {label}
    </span>
  );
}
