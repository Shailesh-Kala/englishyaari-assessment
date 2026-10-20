import { describe, expect, it } from 'vitest';
import { istDayRange } from '../../src/sessions/ist-day.js';

// IST day 21 Oct 2026 = [2026-10-20T18:30:00.000Z, 2026-10-21T18:30:00.000Z)
const OCT_21_IST = {
  start: new Date('2026-10-20T18:30:00.000Z'),
  end: new Date('2026-10-21T18:30:00.000Z'),
};

const at = (iso: string) => new Date(iso).getTime();

describe('istDayRange', () => {
  it.each([
    ['midday IST', '2026-10-21T06:30:00.000Z'],
    ['exactly IST midnight (start is inclusive)', '2026-10-20T18:30:00.000Z'],
    ['the last millisecond of the IST day', '2026-10-21T18:29:59.999Z'],
    ['01:30 IST, when the UTC date is still the 20th', '2026-10-20T20:00:00.000Z'],
  ])('maps %s to the 21 Oct IST day', (_label, iso) => {
    expect(istDayRange(at(iso))).toEqual(OCT_21_IST);
  });

  it('treats the end as exclusive: next IST midnight starts 22 Oct', () => {
    expect(istDayRange(at('2026-10-21T18:30:00.000Z')).start).toEqual(OCT_21_IST.end);
  });
});
