import { describe, it, expect } from 'vitest';
import {
  addKeys,
  describeUnitKey,
  issuesByRole,
  stageLabelText,
  toTargetInputs,
  unitKeyProblem,
  unitKeysOfLetter,
} from './units';
import {
  countFindings,
  declaredFocus,
  describeFinding,
  groupFindings,
  targetIssuesByIndex,
  type RollupFinding,
} from './findings';
import { STAGE_LABELS } from '@kalam/curriculum-schemas';

const letter = (id: string) =>
  ({ ba: { char: 'ب', name: 'Ba' }, kaf: { char: 'ك', name: 'Kaf' } } as Record<
    string,
    { char: string; name: string }
  >)[id];

describe('unit keys from pickers', () => {
  it('maps a letter reference to its unit keys', () => {
    expect(unitKeysOfLetter({ letterId: 'ba', form: 'isolated' })).toEqual(['letter:ba']);
    expect(unitKeysOfLetter({ letterId: 'ba', form: 'initial' })).toEqual(['form:ba:initial']);
    expect(unitKeysOfLetter({ letterId: 'ba', form: 'isolated', haraka: 'fatha' })).toEqual([
      'sound:ba:fatha',
    ]);
    expect(
      unitKeysOfLetter({ letterId: 'ba', form: 'isolated', haraka: 'kasra', madd: true }),
    ).toEqual(['sound:ba:kasra:madd']);
    expect(unitKeysOfLetter({ letterId: 'ba', form: 'medial', haraka: 'shadda' })).toEqual([
      'form:ba:medial',
      'haraka:shadda',
    ]);
  });

  it('every key a picker makes is one the backend accepts', () => {
    for (const key of [
      ...unitKeysOfLetter({ letterId: 'ba', form: 'final', haraka: 'shadda_fatha' }),
      ...unitKeysOfLetter({ letterId: 'kaf', form: 'isolated', haraka: 'sukoon' }),
      'rule:shadda',
    ]) {
      expect(unitKeyProblem(key)).toBeNull();
    }
  });

  it('rejects malformed, reserved and graph-only keys', () => {
    expect(unitKeyProblem('ba')).toMatch(/not a unit key/);
    expect(unitKeyProblem('sound:ba:sukoon:madd')).toMatch(/not a unit key/);
    expect(unitKeyProblem('pa:rhyme')).toMatch(/not taught yet/);
    expect(unitKeyProblem('stage:fatha')).toMatch(/stage/);
  });

  it('adds keys without repeats, in order', () => {
    expect(addKeys(['letter:ba'], ['rule:sukoon', 'letter:ba'])).toEqual([
      'letter:ba',
      'rule:sukoon',
    ]);
  });
});

describe('save body and errors', () => {
  it('orders targets by the scope roles and splits errors back per role', () => {
    const byRole = { review: ['letter:kaf'], focus: ['letter:ba', 'rule:x_y'], prerequisite: [] };
    expect(toTargetInputs('topic', byRole)).toEqual([
      { unit_key: 'letter:ba', role: 'focus' },
      { unit_key: 'rule:x_y', role: 'focus' },
      { unit_key: 'letter:kaf', role: 'review' },
    ]);
    const byIndex = targetIssuesByIndex([
      { index: 1, field: 'unit_key', message: 'bad rule' },
      { index: 2, field: 'role', message: 'bad role' },
      { nonsense: true },
    ]);
    const split = issuesByRole('topic', byRole, byIndex);
    expect(split.focus?.get(1)).toEqual(['bad rule']);
    expect(split.review?.get(0)).toEqual(['bad role']);
    expect(split.prerequisite).toBeUndefined();
  });

  it('reads details the production sanitizer spread into an object', () => {
    const spread = { ...[{ index: 0, field: 'unit_key', message: 'bad' }] };
    expect(targetIssuesByIndex(spread).get(0)).toEqual(['bad']);
    expect(targetIssuesByIndex(undefined).size).toBe(0);
  });

  it('never sends a level focus role', () => {
    expect(
      toTargetInputs('curriculum', { focus: ['letter:ba'], objective: ['rule:shadda'] }),
    ).toEqual([{ unit_key: 'rule:shadda', role: 'objective' }]);
  });
});

describe('plain language', () => {
  it('describes unit keys and patterns', () => {
    expect(describeUnitKey('letter:ba', letter)).toBe('ب (Ba)');
    expect(describeUnitKey('form:ba:medial', letter)).toBe('ب (Ba), middle form');
    expect(describeUnitKey('sound:kaf:fatha:madd', letter)).toBe('ك (Kaf) with fatha (long)');
    expect(describeUnitKey('rule:shadda')).toBe('Rule: Shadda');
    expect(describeUnitKey('sound:*:fatha')).toBe('any letter with fatha');
    expect(describeUnitKey('letter:zay')).toBe('zay');
  });

  it('names every stage label', () => {
    for (const stage of STAGE_LABELS) expect(stageLabelText(stage)).not.toMatch(/_/);
  });

  it('says every finding in a sentence', () => {
    const cases: RollupFinding[] = [
      { code: 'undeclared_review', scope_type: 'topic', scope_id: 't', activity_id: 'a', unit: 'letter:ba' },
      { code: 'off_focus', scope_type: 'topic', scope_id: 't', activity_id: 'a', unit: 'letter:ba', detail: { where: 'later_in_level' } },
      { code: 'off_focus', scope_type: 'topic', scope_id: 't', activity_id: 'a', unit: 'letter:ba', detail: { where: 'outside_level', taught_in_earlier_level: true } },
      { code: 'no_target', scope_type: 'topic', scope_id: 't', activity_id: 'a', detail: { evidence: 'none' } },
      { code: 'focus_not_covered', scope_type: 'curriculum', scope_id: 'l', unit: 'rule:shadda', detail: { role: 'objective' } },
      { code: 'prerequisite_untaught', scope_type: 'topic', scope_id: 't', activity_id: 'a', unit: 'rule:shadda', detail: { prerequisite: 'rule:sukoon' } },
      { code: 'sequence_mismatch', scope_type: 'curriculum', scope_id: 'l', detail: { stage: 'sukoon', other_level: 'l2', other_stage: 'shadda', other_comes: 'before' } },
    ];
    const text = cases.map((f) =>
      describeFinding(f, { letter, levelTitle: (id) => (id === 'l2' ? 'Level 2' : undefined) }),
    );
    expect(text[0]).toContain('ب (Ba)');
    expect(text[1]).toBe('Uses ب (Ba) before the topic that teaches it.');
    expect(text[2]).toContain('an earlier level does');
    expect(text[3]).toContain('Expected');
    expect(text[4]).toBe('No activity in this level teaches the objective Rule: Shadda.');
    expect(text[5]).toBe('Rule: Shadda needs Rule: Sukoon first, and nothing earlier teaches it.');
    expect(text[6]).toBe(
      'This level (Sukoon) comes after Level 2 (Shadda), but the teaching sequence puts them the other way round.',
    );
    for (const t of text) expect(t).not.toMatch(/undefined|_/);
  });
});

describe('grouping', () => {
  const findings: RollupFinding[] = [
    { code: 'off_focus', scope_type: 'topic', scope_id: 't1', activity_id: 'a1', unit: 'letter:ba' },
    { code: 'focus_not_covered', scope_type: 'topic', scope_id: 't1', unit: 'letter:kaf' },
    { code: 'undeclared_review', scope_type: 'topic', scope_id: 't1', activity_id: 'a2', unit: 'letter:ba' },
    { code: 'off_focus', scope_type: 'topic', scope_id: 't1', activity_id: 'a1', unit: 'letter:kaf' },
    { code: 'sequence_mismatch', scope_type: 'curriculum', scope_id: 'l1' },
  ];

  it('groups by activity and puts scope findings per scope, the level first', () => {
    const g = groupFindings(findings);
    expect(g.byActivity.map((x) => [x.activityId, x.findings.length])).toEqual([
      ['a1', 2],
      ['a2', 1],
    ]);
    expect(g.byScope.map((s) => s.scope_id)).toEqual(['l1', 't1']);
  });

  it('counts findings and distinct activities per code', () => {
    const c = countFindings(findings);
    expect(c.off_focus).toEqual({ findings: 2, activities: 1 });
    expect(c.focus_not_covered).toEqual({ findings: 1, activities: 0 });
    expect(c.no_target).toEqual({ findings: 0, activities: 0 });
  });

  it('starts the focus editor from declared keys only', () => {
    expect(declaredFocus({ focus: ['letter:ba'], focus_source: 'legacy' })).toEqual([]);
    expect(declaredFocus({ focus: ['letter:ba'], focus_source: 'declared' })).toEqual(['letter:ba']);
  });
});
