import { describe, it, expect } from 'vitest';
import { findTanweenTopic, getEndingOrderWarning, type OrderedTopic } from './ending';

const topics: OrderedTopic[] = [
  { id: 'a', sequence_number: 1, title: { en: 'Alif' } },
  { id: 'b', sequence_number: 2, title: { en: 'Baa' } },
  { id: 't', sequence_number: 3, title: { en: 'Tanween', ar: 'التنوين' } },
  { id: 'd', sequence_number: 4, title: { en: 'Daal' } },
];

describe('findTanweenTopic', () => {
  it('finds the lesson by its English or Arabic title', () => {
    expect(findTanweenTopic(topics)?.id).toBe('t');
    expect(findTanweenTopic([{ id: 'x', sequence_number: 9, title: { en: 'Lesson', ar: 'تنوين الفتح' } }])?.id).toBe('x');
    expect(findTanweenTopic([{ id: 'y', sequence_number: 1, title: { en: 'Tanwin' } }])?.id).toBe('y');
    expect(findTanweenTopic(topics.filter((t) => t.id !== 't'))).toBeNull();
  });
});

describe('getEndingOrderWarning', () => {
  const run = (topicId: string, ending: 'pausal' | 'full', wordHasTanween = true, list = topics) =>
    getEndingOrderWarning({ ending, topic: { id: topicId }, topics: list, wordHasTanween });

  it('warns for full before the tanween lesson', () => {
    expect(run('b', 'full')).toMatch(/before the tanween lesson/);
  });

  it('says nothing for pausal before it, or full from it on', () => {
    expect(run('b', 'pausal')).toBeNull();
    expect(run('t', 'full')).toBeNull();
    expect(run('d', 'full')).toBeNull();
  });

  it('warns for pausal after it only when the word has tanween', () => {
    expect(run('d', 'pausal', true)).toMatch(/after the tanween lesson/);
    expect(run('d', 'pausal', false)).toBeNull();
  });

  it('warns for full when the curriculum has no tanween lesson', () => {
    const none = topics.filter((t) => t.id !== 't');
    expect(run('d', 'full', true, none)).toMatch(/no tanween lesson/);
    expect(run('d', 'pausal', true, none)).toBeNull();
  });

  it('is silent when the place is unknown', () => {
    expect(getEndingOrderWarning({ ending: 'full', topic: null, topics, wordHasTanween: true })).toBeNull();
    expect(getEndingOrderWarning({ ending: 'full', topic: { id: 'b' }, topics: [], wordHasTanween: true })).toBeNull();
  });
});
