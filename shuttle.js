// BC Newton Shuttle — regular published schedule (no live provider wired in).
//
// Why schedule-only: this app is a static GitHub Pages site with no server backend,
// and BC's TransLoc tracker (bostoncollege.transloc.com) has no documented public API —
// nothing here has been verified as a supported, CORS-accessible, key-free data source.
// Per BC_Newton_Shuttle_Claude_Code_Brief.pdf's own fallback guidance for that case:
// ship the regular schedule + manual stop picker, and link out to BC's live tracker
// instead of guessing at arrival times. Route geometry and stop coordinates are also
// unverified, so there's no "use my location" / walking-time feature here either —
// only the manual stop list BC actually publishes.
//
// Source: BC Transportation shuttle page, checked September 18, 2026.

function fmtClock(m) {
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60), mi = mm % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return mi ? `${hh}:${String(mi).padStart(2, '0')} ${ap}` : `${hh} ${ap}`;
}

function freqLabel(freq) {
  return freq[0] === freq[1] ? `every ${freq[0]} min` : `every ${freq[0]}–${freq[1]} min`;
}

// weekdays: 'weekday' (Mon–Fri) or 'weekend' (Sat–Sun). start/end in minutes past
// midnight of that weekday-type's day; end may exceed 1440 to represent "next day".
const SERVICE_WINDOWS = [
  { days: 'weekday', start: 7 * 60, end: 17 * 60, variant: 'Eagle Direct', freq: [8, 10] },
  { days: 'weekday', start: 17 * 60, end: 18 * 60, variant: 'Newton Limited', freq: [10, 10] },
  { days: 'weekday', start: 18 * 60, end: 26 * 60, variant: 'All Stops', freq: [10, 15] },
  { days: 'weekend', start: 8 * 60 + 15, end: 11 * 60, variant: 'Newton Limited', freq: [30, 30] },
  { days: 'weekend', start: 11 * 60, end: 13 * 60 + 45, variant: 'All Stops', freq: [30, 30] },
  { days: 'weekend', start: 13 * 60 + 45, end: 26 * 60, variant: 'All Stops', freq: [10, 15] }
];

// Published stop order per variant — used to show "next stops," not a verified
// direction/trip mapping. Do not read a "toward X" claim into this ordering.
const VARIANT_SEQUENCE = {
  'Eagle Direct': ['stuart', 'mainGate', 'chestnutHill'],
  'Newton Limited': ['stuart', 'mainGate', 'chestnutHill', 'mcElroy', 'collegeRoad', 'duchesne'],
  'All Stops': ['stuart', 'mainGate', 'chestnutHill', 'robsham', 'conte', 'mcElroy', 'collegeRoad', 'duchesne']
};

export const STOPS = [
  { id: 'stuart', name: 'Newton – Stuart Hall' },
  { id: 'mainGate', name: 'Newton – Main Gate' },
  { id: 'chestnutHill', name: 'Chestnut Hill – Main Gate' },
  { id: 'robsham', name: 'Robsham Theater' },
  { id: 'conte', name: 'Conte Forum' },
  { id: 'mcElroy', name: 'McElroy – Beacon St.' },
  { id: 'collegeRoad', name: 'College Road' },
  { id: 'duchesne', name: 'Newton – Duchesne' }
];

function variantsServing(stopId) {
  return Object.keys(VARIANT_SEQUENCE).filter((v) => VARIANT_SEQUENCE[v].includes(stopId));
}

function windowsFor(variant) {
  return SERVICE_WINDOWS.filter((w) => w.variant === variant);
}

function weekdayType(dow) {
  return dow === 0 || dow === 6 ? 'weekend' : 'weekday';
}

// The currently active window, checking both today's windows and yesterday's
// overnight windows that spill past midnight (a Saturday 00:30 ride is still
// running on Friday's evening schedule).
export function activeWindow(nowMin, dow) {
  const todayType = weekdayType(dow);
  for (const w of SERVICE_WINDOWS) {
    if (w.days === todayType && nowMin >= w.start && nowMin < w.end) return w;
  }
  const yestType = weekdayType((dow + 6) % 7);
  const rel = nowMin + 1440;
  for (const w of SERVICE_WINDOWS) {
    if (w.days === yestType && rel >= w.start && rel < w.end) return w;
  }
  return null;
}

export function stopInfo(stopId, nowMin, dow) {
  const win = activeWindow(nowMin, dow);
  const servedNow = !!(win && VARIANT_SEQUENCE[win.variant].includes(stopId));
  const servingVariants = variantsServing(stopId);
  const nextStops = win && servedNow
    ? VARIANT_SEQUENCE[win.variant].slice(VARIANT_SEQUENCE[win.variant].indexOf(stopId) + 1)
    : [];
  const dayRank = (d) => (d === 'weekday' ? 0 : 1);
  const allWindows = servingVariants.flatMap(windowsFor).sort((a, b) => dayRank(a.days) - dayRank(b.days) || a.start - b.start);
  return { win, servedNow, servingVariants, nextStops, allWindows };
}

export { fmtClock, freqLabel };

export const EARLY_LOOP = {
  title: 'Early loop: Stuart Hall → Conte Forum',
  text: 'Weekdays at 6:00 and 6:30 am, weekends at 7:00 and 7:30 am. Main Gate and Robsham are request stops. These are departure times from Stuart Hall only, not arrival times at every stop.'
};

export const SPECIAL_SERVICE_NOTICES = [
  {
    k: 'Summer',
    v: 'Weekday windows 7:30–10:00 am and 2:30–5:30 pm, every 55 min. No weekend service or midday service. Exact effective dates aren’t verified — check BC Transportation before relying on this.'
  },
  {
    k: 'Holidays & breaks',
    v: 'Combined Newton/Chestnut Hill loop, 7:00 am – 12:15 am, every 30 or 55 min depending on the current flyer or tracker.'
  },
  {
    k: 'Home football',
    v: 'Modified service — Newton pickup moves to Beacon Street between McElroy and the Campion gate. No Robsham or Gate E service during games; campus routes reopen 4 hours after the game ends.'
  }
];

export const SCHEDULE_CHECKED = 'September 18, 2026';
export const LIVE_TRACKER_URL = 'https://bostoncollege.transloc.com/';
