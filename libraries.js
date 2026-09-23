// BC Libraries — O'Neill and Bapst.
//
// Source: BC_Oneill_Bapst_Library_Hours_Claude_Brief.pdf, checked September 23, 2026.
// Official calendar: https://libcal.bc.edu/hours/
//
// Why this isn't modeled like dining hours: libraries don't follow a recurring
// weekly pattern the way a dining hall does — BC posts a dated calendar, and
// some days on it are genuinely incomplete (an opening time with no posted
// close, or a closing time with no posted reopening). The brief is explicit
// that an incomplete day must show as unknown, never silently as closed, so
// this needs its own status logic rather than reusing hours.js's
// weekly-pattern model, which has no concept of "we don't know."
//
// Each library's KNOWN open windows, by calendar date. `e` is minutes past
// midnight that date, and can be:
//   - a normal number (closes that day)
//   - a number > 1440 (BC's calendar explicitly states it runs into the next
//     calendar date, e.g. Saturday's posted "9:00 a.m.–2:00 a.m. next day")
//   - null (BC's calendar only posted an opening event with no close time —
//     do NOT default this to end-of-day; that would silently fabricate a
//     midnight close BC never actually posted)
// Any time on a checked date not covered by that date's own window, or a
// spillover from the previous date's window, falls to that library's `gapStatus`.
const CHECKED_RANGE = { start: '2026-09-20', end: '2026-09-26' };

const ONEILL_WINDOWS = {
  '2026-09-20': [[540, null]],  // "Opens 9:00 a.m." — no close time posted that day
  '2026-09-21': [[0, 1440]],    // Open 24 hours
  '2026-09-22': [[0, 1440]],
  '2026-09-23': [[0, 1440]],
  '2026-09-24': [[0, 1440]],
  '2026-09-25': [[0, 120]],     // tail of the overnight session; calendar's own "closes 2:00 a.m."
  '2026-09-26': [[540, 1560]]   // "9:00 a.m.–2:00 a.m. next day"
};

const BAPST_WINDOWS = {
  '2026-09-20': [[660, 1440]],
  '2026-09-21': [[480, 1440]],
  '2026-09-22': [[480, 1440]],
  '2026-09-23': [[480, 1440]],
  '2026-09-24': [[480, 1440]],
  '2026-09-25': [[480, 1020]],
  '2026-09-26': [[570, 1020]]
};

export const LIBRARIES = [
  {
    id: 'oneill',
    name: 'O’Neill Library',
    place: 'Main Campus',
    group: 'library',
    windows: ONEILL_WINDOWS,
    // O'Neill's calendar has real gaps in what's posted (see Sept 25 above) —
    // an unposted stretch should read as unverified, not closed.
    gapStatus: 'unknown',
    accessNote: 'BC ID required for entry 10 pm–7 am. During the published late-night period (Sept 8–Nov 29), Sun–Thu access from 2–7 am and Fri–Sat access from 10 pm–2 am is limited to Level One. All floors are open 24/7 during finals (Nov 30–Dec 20).',
    sourceUrl: 'https://libguides.bc.edu/oneill/hours'
  },
  {
    id: 'bapst',
    name: 'Bapst Library',
    place: 'Main Campus',
    group: 'library',
    windows: BAPST_WINDOWS,
    // Bapst's posted hours are complete for every checked day, so an
    // unposted stretch really does mean closed.
    gapStatus: 'closed',
    accessNote: 'BC ID required for late-night access, 10 pm–midnight.',
    sourceUrl: 'https://libguides.bc.edu/bapst/hours'
  }
];

export const LIBRARIES_CHECKED = 'September 23, 2026';
export const LIBRARIES_HUB_URL = 'https://libcal.bc.edu/hours/';

function prevDateStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// status.kind: 'open' | 'closed' | 'unknown'. `closesAt` is minutes-past-midnight
// TODAY when known — null both when BC's calendar posted no close time at all,
// and when the close is stated but falls on the next calendar date (in which
// case `spillsToNextDay` is true instead of fabricating a same-day time).
export function libraryStatusFor(lib, dateStr, nowMin) {
  const todayWindows = lib.windows[dateStr] || [];
  for (const [s, e] of todayWindows) {
    const effectiveEnd = e === null ? 1440 : Math.min(e, 1440);
    if (nowMin >= s && nowMin < effectiveEnd) {
      const spills = e !== null && e > 1440;
      return { kind: 'open', closesAt: e !== null && e <= 1440 ? e : null, spillsToNextDay: spills, nextDayCloseAt: spills ? e - 1440 : null };
    }
  }
  const yestWindows = lib.windows[prevDateStr(dateStr)] || [];
  for (const [, e] of yestWindows) {
    if (e !== null && e > 1440 && nowMin < e - 1440) {
      return { kind: 'open', closesAt: e - 1440, spillsToNextDay: false };
    }
  }
  const inCheckedRange = dateStr >= CHECKED_RANGE.start && dateStr <= CHECKED_RANGE.end;
  return { kind: inCheckedRange ? lib.gapStatus : 'unknown' };
}
