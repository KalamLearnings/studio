/** The real routes behind `ConnectApi` (`lib/connections/ops.ts`). */

import { attachConceptPicture, createConcept, detachConceptPicture, linkFamilyToConcept, unlinkFamilyFromConcept } from "@/lib/api/concepts";
import { createWordFamily, setWordFamily, setWordPseudo, setWordReadsAs, updateWordFamily } from "@/lib/api/wordFamilies";
import type { ConnectApi } from "./ops";

export const REAL_CONNECT_API: ConnectApi = {
  setWordFamily,
  setWordReadsAs,
  updateWordFamily,
  createWordFamily,
  linkFamilyToConcept,
  unlinkFamilyFromConcept,
  attachConceptPicture: (concept, assetId) => attachConceptPicture(concept, assetId),
  detachConceptPicture,
  setWordPseudo,
  createConcept,
};
