"use client";

/**
 * Display hints for stored references (CM-S12): a stored reading-type row
 * keeps ids only, so its words and pictures are drawn from the libraries:
 * the word bank (`GET /words`) and the image library (the registry ids).
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { listCuratedWords } from "@/lib/api/wordFamilies";
import { getAssets } from "@/lib/services/assetService";
import type { ReferenceHints } from "@/lib/readingTypes/common";
import type { CuratedWord } from "@/lib/types/wordFamilies";

export function useCuratedWords() {
  return useQuery({ queryKey: ["curated-words"], queryFn: listCuratedWords, staleTime: 60 * 1000 });
}

export function useReferenceHints(): ReferenceHints & { wordById: (id: string) => CuratedWord | undefined } {
  const words = useCuratedWords();
  const assets = useQuery({ queryKey: ["image-assets-by-registry-id"], queryFn: () => getAssets(), staleTime: 5 * 60 * 1000 });
  const wordMap = React.useMemo(() => new Map((words.data ?? []).map((w) => [w.id, w])), [words.data]);
  const urlMap = React.useMemo(
    () => new Map((assets.data ?? []).filter((a) => a.registryId).map((a) => [a.registryId as string, a.url])),
    [assets.data],
  );
  return React.useMemo(
    () => ({
      wordById: (id: string) => wordMap.get(id),
      wordText: (id: string) => wordMap.get(id)?.arabic,
      imageUrl: (id: string) => urlMap.get(id),
    }),
    [wordMap, urlMap],
  );
}
