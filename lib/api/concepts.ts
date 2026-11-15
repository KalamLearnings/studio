/**
 * The concept editor's backend routes (`words` edge function, CM-B11), staff only.
 * `:concept` is a concept's uuid or slug.
 */

import { fetchWithAuth } from './client';
import type {
  Concept,
  ConceptDetail,
  CreateConceptBody,
  UpdateConceptBody,
} from '@/lib/types/wordFamilies';

const enc = encodeURIComponent;
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/** `GET /words/concepts`. */
export const listConcepts = () => fetchWithAuth<Concept[]>('/words/concepts');

/** `GET /words/concepts/:concept`: with its families and pictures. */
export const getConcept = (ref: string) => fetchWithAuth<ConceptDetail>(`/words/concepts/${enc(ref)}`);

/** `POST /words/concepts`. */
export const createConcept = (body: CreateConceptBody) =>
  fetchWithAuth<Concept>('/words/concepts', { method: 'POST', ...json(body) });

/** `PATCH /words/concepts/:concept`. */
export const updateConcept = (ref: string, body: UpdateConceptBody) =>
  fetchWithAuth<Concept>(`/words/concepts/${enc(ref)}`, { method: 'PATCH', ...json(body) });

/** `PUT /words/families/:familyId/concepts/:concept`: the family names the concept (`depicts`). */
export const linkFamilyToConcept = (familyId: string, concept: string) =>
  fetchWithAuth<unknown>(`/words/families/${enc(familyId)}/concepts/${enc(concept)}`, { method: 'PUT' });

/** `DELETE /words/families/:familyId/concepts/:concept`. */
export const unlinkFamilyFromConcept = (familyId: string, concept: string) =>
  fetchWithAuth<{ removed: boolean }>(`/words/families/${enc(familyId)}/concepts/${enc(concept)}`, {
    method: 'DELETE',
  });

/** `PUT /words/concepts/:concept/pictures/:assetId`. */
export const attachConceptPicture = (concept: string, assetId: string, sortOrder?: number) =>
  fetchWithAuth<unknown>(`/words/concepts/${enc(concept)}/pictures/${enc(assetId)}`, {
    method: 'PUT',
    ...json(sortOrder === undefined ? {} : { sortOrder }),
  });

/** `DELETE /words/concepts/:concept/pictures/:assetId`. */
export const detachConceptPicture = (concept: string, assetId: string) =>
  fetchWithAuth<{ removed: boolean }>(`/words/concepts/${enc(concept)}/pictures/${enc(assetId)}`, {
    method: 'DELETE',
  });

/**
 * Every concept with its families and pictures. The backend has no
 * family-to-concept read, so the family editor asks for the details and
 * filters (a few dozen small reads, in batches of 8).
 */
export async function loadConceptDetails(): Promise<ConceptDetail[]> {
  const list = await listConcepts();
  const out: ConceptDetail[] = [];
  for (let i = 0; i < list.length; i += 8) {
    out.push(...(await Promise.all(list.slice(i, i + 8).map((c) => getConcept(c.id)))));
  }
  return out;
}
