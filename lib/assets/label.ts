/**
 * Pure label and status rules for the asset library (CM-S4). The backend
 * decides; these mirror `core/domain/assets/labels.ts` only so the label form
 * can say what a save will do before it is sent.
 */

import type {
  AssetLabel,
  AssetStatus,
  RegistryStatus,
  StatusFilter,
} from '@/lib/types/assetRegistry';

export const EMPTY_LABEL: AssetLabel = {
  ownerType: null,
  ownerId: null,
  role: null,
  locale: null,
  text: null,
};

const clean = (v: string | null | undefined): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
};

/** Trims every field; blanks become null. */
export function normaliseLabel(label: Partial<AssetLabel>): AssetLabel {
  return {
    ownerType: clean(label.ownerType),
    ownerId: clean(label.ownerId),
    role: clean(label.role),
    locale: clean(label.locale),
    text: clean(label.text),
  };
}

/** A label identifies a file when it names a role and either the owner or the exact text. */
export function isIdentifyingLabel(label: AssetLabel): boolean {
  if (!label.role) return false;
  return !!(label.ownerType && label.ownerId) || !!label.text;
}

/** The status the backend gives a file after a person relabels it. */
export function statusAfterLabel(current: AssetStatus, label: AssetLabel): AssetStatus {
  const identifies = isIdentifyingLabel(label);
  if (current === 'quarantined' && identifies) return 'active';
  if (current === 'active' && !identifies) return 'quarantined';
  return current;
}

/** The form-side problems the backend would refuse (ASSET_LABEL_INVALID). */
export function labelProblems(label: AssetLabel): string[] {
  const problems: string[] = [];
  const slug = /^[a-z][a-z_]*$/;
  const locale = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
  if ((label.ownerType === null) !== (label.ownerId === null)) {
    problems.push('An owner needs both its type and its id.');
  }
  if (label.ownerType !== null && !slug.test(label.ownerType)) {
    problems.push('Owner type must be lower-case letters and underscores (e.g. letter, word, concept).');
  }
  if (label.role !== null && !slug.test(label.role)) {
    problems.push('Role must be lower-case letters and underscores (e.g. letter_sound, illustration).');
  }
  if (label.locale !== null && !locale.test(label.locale)) {
    problems.push('Locale must be a language code (e.g. ar, en, fr).');
  }
  return problems;
}

/** Whether a row with this registry status passes the status filter. */
export function matchesStatusFilter(
  status: RegistryStatus,
  filter: StatusFilter | undefined,
): boolean {
  if (!filter) return true;
  if (filter === 'unregistered') return status === null;
  return status === filter;
}

/** A short human description of a label, for list rows. */
export function describeLabel(label: AssetLabel | null): string | null {
  if (!label) return null;
  const owner = label.ownerType && label.ownerId ? `${label.ownerType}:${label.ownerId}` : null;
  const parts = [label.role, owner, label.text, label.locale].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}
