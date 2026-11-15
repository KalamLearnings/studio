/**
 * Reads of the asset registry (`assets`, CM-B5) for the library screens.
 *
 * Staff read `assets` through PostgREST (the table's "Staff can read assets"
 * policy, made for Studio's library). Studio never writes it: uploads and
 * labels go through `lib/api/assets.ts`.
 *
 * When the registry cannot be read (an environment without CM-B5), these
 * return nothing and the screens show every file as "not in registry".
 */

import { createClient } from '@/lib/supabase/client';
import type {
  AssetLabel,
  AssetMedia,
  AssetStatus,
} from '@/lib/types/assetRegistry';

const TABLE = 'assets';
const PAGE = 1000;
const ID_CHUNK = 100;

const COLUMNS =
  'id,bucket,path,media,mime,bytes,width,height,duration_ms,status,' +
  'label_owner_type,label_owner_id,label_role,label_locale,label_text,created_at,updated_at';

interface AssetRow {
  id: string;
  bucket: string;
  path: string;
  media: AssetMedia;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  status: AssetStatus;
  label_owner_type: string | null;
  label_owner_id: string | null;
  label_role: string | null;
  label_locale: string | null;
  label_text: string | null;
  created_at: string;
  updated_at: string;
}

/** A registry row as the library screens use it. */
export interface RegistryEntry {
  id: string;
  bucket: string;
  path: string;
  media: AssetMedia;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  status: AssetStatus;
  label: AssetLabel;
  createdAt: string;
  updatedAt: string;
}

function toEntry(row: AssetRow): RegistryEntry {
  return {
    id: row.id,
    bucket: row.bucket,
    path: row.path,
    media: row.media,
    mime: row.mime,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms,
    status: row.status,
    label: {
      ownerType: row.label_owner_type,
      ownerId: row.label_owner_id,
      role: row.label_role,
      locale: row.label_locale,
      text: row.label_text,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The registry rows for these ids (ids without a row are absent from the map). */
export async function getRegistryEntries(ids: string[]): Promise<Map<string, RegistryEntry>> {
  const result = new Map<string, RegistryEntry>();
  if (ids.length === 0) return result;
  const supabase = createClient();
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).in('id', chunk);
    if (error) {
      console.warn('Asset registry not readable; statuses unknown:', error.message);
      return new Map();
    }
    for (const row of (data ?? []) as unknown as AssetRow[]) result.set(row.id, toEntry(row));
  }
  return result;
}

/** Every registry row of one medium, newest first (paged past PostgREST's row cap). */
export async function listRegistryEntries(media: AssetMedia): Promise<RegistryEntry[]> {
  const supabase = createClient();
  const entries: RegistryEntry[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('media', media)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.warn('Asset registry not readable:', error.message);
      return [];
    }
    const rows = (data ?? []) as unknown as AssetRow[];
    entries.push(...rows.map(toEntry));
    if (rows.length < PAGE) return entries;
  }
}

/** The public URL of a registry address (Studio display only; data stores the id). */
export function registryPublicUrl(entry: Pick<RegistryEntry, 'bucket' | 'path'>): string {
  const supabase = createClient();
  return supabase.storage.from(entry.bucket).getPublicUrl(entry.path).data.publicUrl;
}
