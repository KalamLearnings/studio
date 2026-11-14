/**
 * blend-word (SB-B1): the shared JSON table, run row by row against Studio's
 * copy of the splitter. The backend runs the same table against its original
 * (kalam-readers-backend blend-word.test.ts); blend-word-drift.test.ts there
 * keeps src/blend-word.ts, src/blend.ts and this table byte-identical.
 */

import { describe, it, expect } from 'vitest';
import {
  BLEND_SPLITTER_VERSION,
  type BlendForm,
  type BlendUnit,
  checkBlendUnits,
  splitBlendWord,
} from '../src/blend-word';
import { type BlendUnit as ContractBlendUnit, BlendUnitsSchema } from '../src/blend';
import table from './blend-word.cases.json';

interface SplitCase {
  input: string;
  form: BlendForm;
  note: string;
  text: string;
  ok: boolean;
  issues: string[];
  units: { text: string; kind: string; tags: string[]; span: Record<string, unknown> }[];
}

interface OverrideCase {
  text: string;
  note: string;
  units: { text: string; tags: BlendUnit['tags'] }[];
  issues: string[];
}

const splits = table.splits as SplitCase[];
const overrides = table.overrides as OverrideCase[];

// The domain type and the contract type describe the same shape.
const _domainToContract = (u: BlendUnit): ContractBlendUnit => u;
const _contractToDomain = (u: ContractBlendUnit): BlendUnit => u;
void _domainToContract;
void _contractToDomain;

describe('blend-word shared table', () => {
  it('matches the splitter version', () => {
    expect(table.splitterVersion).toBe(BLEND_SPLITTER_VERSION);
    expect(splits.length).toBeGreaterThanOrEqual(40);
  });

  it.each(splits.map((row) => [`${row.form} ${row.input || '(empty)'}: ${row.note}`, row] as const))(
    'split %s',
    (_name, row) => {
      const got = splitBlendWord(row.input, row.form);
      expect(got.text).toBe(row.text);
      expect(got.form).toBe(row.form);
      expect(got.issues.map((i) => i.code)).toEqual(row.issues);
      expect(got.ok).toBe(row.ok);
      expect(got.units.map((u) => ({ text: u.text, kind: u.kind, tags: u.tags, span: u.span }))).toStrictEqual(
        row.units,
      );
      if (got.ok) {
        // a valid split is a valid stored shape
        const parsed = BlendUnitsSchema.safeParse(got.units);
        expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
        expect(checkBlendUnits(got.text, got.units)).toEqual([]);
      }
    },
  );

  it.each(overrides.map((row) => [`${row.text}: ${row.note}`, row] as const))(
    'override check %s',
    (_name, row) => {
      expect(checkBlendUnits(row.text, row.units).map((i) => i.code)).toEqual(row.issues);
    },
  );
});
