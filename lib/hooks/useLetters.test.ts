import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/lib/utils/letterMadd', () => ({}));
import { letterFilters } from './useLetters';

const L = (id: string) => ({ id }) as never;

describe('letterFilters.hamzaCarriers', () => {
  it('uses the canonical ids', () => {
    expect(letterFilters.hamzaCarriers(L('yaa'))).toBe(true);
    expect(letterFilters.hamzaCarriers(L('ya'))).toBe(false);
    expect(letterFilters.hamzaCarriers(L('alif'))).toBe(true);
    expect(letterFilters.hamzaCarriers(L('ba'))).toBe(false);
  });
});
