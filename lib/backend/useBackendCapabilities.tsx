"use client";

/**
 * The current environment's backend capabilities for components
 * (`lib/backend/capabilities.ts`). The activity form reads them once when it
 * opens and provides them, so the form's fields and its save agree.
 */

import * as React from "react";
import { getPersistedEnvironment } from "@/lib/stores/environmentStore";
import { backendCapabilitiesFor, type BackendCapabilities } from "./capabilities";

/** The persisted environment's capabilities (read synchronously, as the API client reads the environment). */
export function currentBackendCapabilities(): Readonly<BackendCapabilities> {
  return backendCapabilitiesFor(getPersistedEnvironment());
}

const BackendCapabilitiesContext = React.createContext<Readonly<BackendCapabilities> | null>(null);

export function BackendCapabilitiesProvider({
  value,
  children,
}: {
  value: Readonly<BackendCapabilities>;
  children: React.ReactNode;
}) {
  return <BackendCapabilitiesContext.Provider value={value}>{children}</BackendCapabilitiesContext.Provider>;
}

/** The provided capabilities, else the persisted environment's. */
export function useBackendCapabilities(): Readonly<BackendCapabilities> {
  const provided = React.useContext(BackendCapabilitiesContext);
  return provided ?? currentBackendCapabilities();
}
