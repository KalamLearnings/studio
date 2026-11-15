/**
 * The asset registry (`assets`, content model CM-B5, decision D8).
 *
 * One row per stored file. The backend names the path, measures the file and
 * writes every row; Studio reads it (staff read through PostgREST) and changes
 * it only through the `assets` edge function (CM-S4).
 * Mirrors `kalam-readers-backend` `core/domain/assets/asset.ts` and
 * `core/contracts/assets.ts`.
 */

export const ASSET_STATUSES = [
  'active',
  'superseded',
  'orphan',
  'broken',
  'quarantined',
  'retired',
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetMedia = 'audio' | 'image' | 'animation';

/** What the file is (never who uses it). Blank fields are null. */
export interface AssetLabel {
  ownerType: string | null;
  ownerId: string | null;
  role: string | null;
  locale: string | null;
  text: string | null;
}

/** Where a TTS or AI-made file came from. */
export interface AssetProvenance {
  provider: string;
  model: string | null;
  voiceId: string | null;
  promptVersion: string | null;
  request: Record<string, unknown> | null;
}

/** The library fields of a registered file (never the label). */
export interface AssetLibraryFields {
  displayName: string | null;
  category: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

/** The statuses a person sets with `PUT /assets/:assetId/status`. */
export type PersonStatus = 'active' | 'retired' | 'quarantined' | 'broken';

/** `GET /assets/:assetId` and the upload's `asset`. */
export interface RegistryAsset {
  id: string;
  media: AssetMedia;
  bucket: string;
  path: string;
  url: string;
  mime: string;
  bytes: number;
  sha256: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  origin: 'upload' | 'tts' | 'derived' | 'recorded' | 'legacy';
  provenance: AssetProvenance | null;
  label: AssetLabel;
  status: AssetStatus;
  /** The asset that replaced this one (status `superseded`). */
  supersededBy: string | null;
  library: AssetLibraryFields;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

/**
 * The registry status a library row shows: a status, or `null` when the file
 * has no `assets` row yet (uploaded before CM-B5, not yet backfilled).
 */
export type RegistryStatus = AssetStatus | null;

/** The status filter of the library screens. */
export type StatusFilter = AssetStatus | 'unregistered';

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'quarantined', label: 'Quarantined' },
  { value: 'orphan', label: 'Orphan' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'broken', label: 'Broken' },
  { value: 'retired', label: 'Retired' },
  { value: 'unregistered', label: 'Not in registry' },
];
