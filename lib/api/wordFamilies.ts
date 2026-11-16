/**
 * The word family editor's backend routes (`words` edge function, CM-B10),
 * staff only. Studio writes nothing itself (CM-S5).
 */

import { fetchWithAuth } from './client';
import type {
  CreateWordFamilyBody,
  CuratedWord,
  UpdateWordFamilyBody,
  WordFamily,
  WordFamilyDetail,
} from '@/lib/types/wordFamilies';

const enc = encodeURIComponent;
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/** `GET /words/families`. */
export const listWordFamilies = () => fetchWithAuth<WordFamily[]>('/words/families');

/** `GET /words/families/:familyId`: with its spellings. */
export const getWordFamily = (id: string) =>
  fetchWithAuth<WordFamilyDetail>(`/words/families/${enc(id)}`);

/** `POST /words/families`. */
export const createWordFamily = (body: CreateWordFamilyBody) =>
  fetchWithAuth<WordFamily>('/words/families', { method: 'POST', ...json(body) });

/** `PATCH /words/families/:familyId`. */
export const updateWordFamily = (id: string, body: UpdateWordFamilyBody) =>
  fetchWithAuth<WordFamily>(`/words/families/${enc(id)}`, { method: 'PATCH', ...json(body) });

/** `PUT /words/:wordId/family`: null takes the spelling out of its family. */
export const setWordFamily = (wordId: string, familyId: string | null) =>
  fetchWithAuth<CuratedWord>(`/words/${enc(wordId)}/family`, { method: 'PUT', ...json({ familyId }) });

/** `PUT /words/:wordId/reads-as`: null clears the reading. */
export const setWordReadsAs = (wordId: string, readsAsId: string | null) =>
  fetchWithAuth<CuratedWord>(`/words/${enc(wordId)}/reads-as`, {
    method: 'PUT',
    ...json({ readsAsId }),
  });

/** `PUT /words/:wordId/review`: true records the reviewer's approval, false withdraws it. */
export const setWordReviewed = (wordId: string, reviewed: boolean) =>
  fetchWithAuth<CuratedWord>(`/words/${enc(wordId)}/review`, { method: 'PUT', ...json({ reviewed }) });

/** `GET /words`: every live spelling with its curation columns (the pickers filter client-side). */
export const listCuratedWords = () => fetchWithAuth<CuratedWord[]>('/words');

/**
 * `PUT /words/:wordId/spelling`: rewrites the spelling of a row no activity
 * uses (owner answer 5: wrong harakat on an unused word is fixed directly).
 * Clears the review. 400 `WORD_SPELLING_INVALID`; 409 `WORD_SPELLING_TAKEN`,
 * `WORD_IN_USE`, `WORD_HAS_BLEND`.
 */
export const changeWordSpelling = (wordId: string, arabic: string) =>
  fetchWithAuth<CuratedWord>(`/words/${enc(wordId)}/spelling`, { method: 'PUT', ...json({ arabic }) });

/**
 * `PUT /words/:wordId/pseudo` (B-7): marks a spelling as a practice (drill)
 * word, or not. Curriculum lead or phrase reviewer. Marking is refused with
 * 409 `WORD_IN_FAMILY` and `WORD_HAS_READING`; clearing always works.
 */
export const setWordPseudo = (wordId: string, isPseudo: boolean) =>
  fetchWithAuth<CuratedWord>(`/words/${enc(wordId)}/pseudo`, { method: 'PUT', ...json({ isPseudo }) });

/** `PUT /words/families/:familyId/pictures/:assetId`: a picture kept on the family itself. */
export const attachFamilyPicture = (familyId: string, assetId: string) =>
  fetchWithAuth<unknown>(`/words/families/${enc(familyId)}/pictures/${enc(assetId)}`, { method: 'PUT', ...json({}) });

/** `DELETE /words/families/:familyId/pictures/:assetId`. */
export const detachFamilyPicture = (familyId: string, assetId: string) =>
  fetchWithAuth<{ removed: boolean }>(`/words/families/${enc(familyId)}/pictures/${enc(assetId)}`, { method: 'DELETE' });
