"use client";

/**
 * Which `ConnectionsSource` the Words page reads. The default reads the
 * existing routes (`routesSource`); a preview or a test provides its own.
 */

import * as React from "react";
import { listCuratedWords, listWordFamilies } from "@/lib/api/wordFamilies";
import { loadConceptDetails } from "@/lib/api/concepts";
import { getWordUsage } from "@/lib/api/wordUsage";
import { fetchLetters } from "@/lib/hooks/useLetters";
import { routesSource, type ConnectionsSource } from "@/lib/connections/source";

export const defaultSource: ConnectionsSource = routesSource({
  listWords: listCuratedWords,
  listFamilies: listWordFamilies,
  listConceptDetails: loadConceptDetails,
  listLetters: fetchLetters,
  wordUsage: getWordUsage,
});

const SourceContext = React.createContext<ConnectionsSource>(defaultSource);

export const ConnectionsSourceProvider = SourceContext.Provider;
export const useConnectionsSource = () => React.useContext(SourceContext);
