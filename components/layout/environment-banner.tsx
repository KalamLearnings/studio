"use client";

import { AlertTriangle, Server } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentBannerProps {
  environment: "dev" | "prod";
  onSwitch?: () => void;
}

export function EnvironmentBanner({
  environment,
  onSwitch,
}: EnvironmentBannerProps) {
  const isProd = environment === "prod";

  if (!isProd) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-10 items-center justify-center gap-2 text-sm font-medium",
        "bg-env-prod text-env-prod-foreground"
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <span>PRODUCTION ENVIRONMENT</span>
      <span className="mx-2">|</span>
      <span>Changes will affect live users</span>
      {onSwitch && (
        <>
          <span className="mx-2">|</span>
          <button
            onClick={onSwitch}
            className="underline underline-offset-2 hover:no-underline"
          >
            Switch to Development
          </button>
        </>
      )}
    </div>
  );
}

export function EnvironmentIndicator({
  environment,
  onClick,
}: {
  environment: "dev" | "prod";
  onClick?: () => void;
}) {
  const isProd = environment === "prod";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        isProd
          ? "bg-env-prod/10 text-env-prod hover:bg-env-prod/20"
          : "bg-env-dev/10 text-env-dev hover:bg-env-dev/20"
      )}
    >
      <Server className="h-3 w-3" />
      <span>{isProd ? "PROD" : "DEV"}</span>
    </button>
  );
}
