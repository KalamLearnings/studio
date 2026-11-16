"use client";

/**
 * Words (CG-1): the connections map. Find a word, see what it is connected
 * to, and what is missing. Design: `design/concepts/content-graph/`
 * (approved 2026-11-16). It replaces the old word list and the Families and
 * Concepts pages (their routes redirect here).
 */

import * as React from "react";
import { WordsPage } from "@/components/connections/WordsPage";
import { useConnectAccess } from "@/lib/hooks/useConnections";

function Words() {
  const access = useConnectAccess();
  return <WordsPage access={access} />;
}

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <Words />
    </React.Suspense>
  );
}
