"use client";

/**
 * The routes the Family and Concept editors use (CM-B10, CM-B11), behind a
 * context so a preview or a test can stand in for the server. The default is
 * the real API; the old `/families` and `/concepts` pages use it unchanged.
 */

import * as React from "react";
import {
  attachConceptPicture,
  createConcept,
  detachConceptPicture,
  getConcept,
  linkFamilyToConcept,
  listConcepts,
  loadConceptDetails,
  unlinkFamilyFromConcept,
  updateConcept,
} from "@/lib/api/concepts";
import {
  createWordFamily,
  getWordFamily,
  listCuratedWords,
  listWordFamilies,
  setWordFamily,
  setWordReadsAs,
  setWordReviewed,
  updateWordFamily,
} from "@/lib/api/wordFamilies";

export const REAL_LIBRARY_API = {
  listWordFamilies,
  getWordFamily,
  createWordFamily,
  updateWordFamily,
  setWordFamily,
  setWordReadsAs,
  setWordReviewed,
  listCuratedWords,
  listConcepts,
  loadConceptDetails,
  getConcept,
  createConcept,
  updateConcept,
  linkFamilyToConcept,
  unlinkFamilyFromConcept,
  attachConceptPicture,
  detachConceptPicture,
};

export type LibraryApi = typeof REAL_LIBRARY_API;

export const LibraryApiContext = React.createContext<LibraryApi>(REAL_LIBRARY_API);

export const useLibraryApi = () => React.useContext(LibraryApiContext);
