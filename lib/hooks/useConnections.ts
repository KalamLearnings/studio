/**
 * The Words page's reads (CG-1 to CG-6), through the `ConnectionsSource` the
 * page is given (`components/connections/SourceContext.tsx`). Read only.
 */

import * as React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { buildGraph, type Graph } from "@/lib/connections/graph";
import type { NodeKey } from "@/lib/connections/keys";
import type { UsageLookup } from "@/lib/connections/neighbourhood";
import { USAGE_UNAVAILABLE, type ConnectionsSource } from "@/lib/connections/source";
import { connectAccess, type ConnectAccess } from "@/lib/connections/access";
import { getClientForEnv } from "@/lib/supabase/client";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";

export function useConnectionsGraph(source: ConnectionsSource) {
  const q = useQuery({
    queryKey: ["connections", "library"],
    queryFn: () => source.library(),
    staleTime: 60_000,
  });
  const graph = React.useMemo<Graph | null>(() => (q.data ? buildGraph(q.data) : null), [q.data]);
  return { graph, loading: q.isLoading, error: q.error as Error | null, refetch: q.refetch };
}

/** Loads the uses of `units` and answers the neighbourhood's lookups. */
export function useConnectionsUsage(source: ConnectionsSource, units: readonly NodeKey[]): UsageLookup {
  const results = useQueries({
    queries: units.map((unit) => ({
      queryKey: ["connections", "usage", unit],
      queryFn: async () => {
        const p = source.usage(unit);
        return p ? { items: await p } : { items: null };
      },
      staleTime: 60_000,
    })),
  });
  // A plain function: `results` is a new array every render, and the neighbourhood is cheap.
  return (unit) => {
    const i = units.indexOf(unit);
    const r = i >= 0 ? results[i] : undefined;
    if (!r || r.isLoading) return { status: "loading" };
    if (r.isError) return { status: "error" };
    if (!r.data || r.data.items === null) return { status: "unavailable", reason: USAGE_UNAVAILABLE };
    return { status: "ready", items: r.data.items };
  };
}

/** Owner decision 3: whether the signed-in staff member may connect, and why not. Null until the session is read. */
export function useConnectAccess(): ConnectAccess | null {
  const { environment } = useEnvironmentStore();
  const [access, setAccess] = React.useState<ConnectAccess | null>(null);
  React.useEffect(() => {
    let live = true;
    getClientForEnv(environment)
      .auth.getUser()
      .then(({ data: { user } }) => live && setAccess(connectAccess(user)))
      .catch(() => live && setAccess(connectAccess(null)));
    return () => {
      live = false;
    };
  }, [environment]);
  return access;
}
