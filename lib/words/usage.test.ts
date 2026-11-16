import { describe, expect, it } from 'vitest';
import type { WordUsageItem } from '@/lib/api/wordUsage';
import { builderHref, groupUsage } from './usage';

const it1 = (o: Partial<WordUsageItem>): WordUsageItem => ({
  activity_id: 'a1',
  type: 'multiple_choice_question',
  node_id: 'n1',
  curriculum_id: 'c1',
  node_title: 'Intro',
  topic_title: 'Ba',
  curriculum_title: 'Alphabet',
  role: 'target',
  ...o,
});

describe('groupUsage', () => {
  it('groups by curriculum, then node, then activity, with ordered roles', () => {
    const groups = groupUsage([
      it1({ role: 'exposure' }),
      it1({ role: 'target' }),
      it1({ activity_id: 'a2' }),
      it1({ activity_id: 'a3', node_id: 'n2', node_title: 'Practice' }),
      it1({ activity_id: 'a4', curriculum_id: 'c2', curriculum_title: 'Words' }),
    ]);
    expect(groups.map((g) => [g.curriculumId, g.nodes.map((n) => n.nodeId)])).toEqual([
      ['c1', ['n1', 'n2']],
      ['c2', ['n1']],
    ]);
    expect(groups[0].nodes[0].activities.map((a) => [a.activityId, a.roles])).toEqual([
      ['a1', ['target', 'exposure']],
      ['a2', ['target']],
    ]);
  });

  it('is empty for no uses', () => expect(groupUsage([])).toEqual([]));
});

describe('builderHref', () => {
  it('uses the drafts pane pattern', () => expect(builderHref('c 1')).toBe('/curricula/c%201/builder'));
  it('is null without a curriculum', () => expect(builderHref('')).toBeNull());
});
