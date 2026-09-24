// Explicit America/New_York date handling for Campus Activities — never
// relies on the visitor's device timezone (a student checking this from a
// laptop set to a different zone must still see the correct "today").

const ET_ZONE = 'America/New_York';

// "YYYY-MM-DD" for a given instant, as that calendar date reads in ET —
// regardless of the runtime's own local timezone.
export function etDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

// Adds `days` calendar days to a "YYYY-MM-DD" key (pure string/date-math,
// no timezone involved once we already have a key).
export function addDaysToKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

// True if `a` (a date key) is before `b`.
export function keyBefore(a, b) {
  return a < b;
}

// Buckets an ISO instant into 'today' | 'tomorrow' | 'thisWeek' | 'past' |
// 'later' relative to `todayKey` (the ET date key for "now"). `endKey` is
// the exclusive end of the 7-day window (todayKey + 7).
export function bucketFor(instant, todayKey, endKey) {
  const key = etDateKey(new Date(instant));
  if (key < todayKey) return 'past';
  if (key === todayKey) return 'today';
  const tomorrowKey = addDaysToKey(todayKey, 1);
  if (key === tomorrowKey) return 'tomorrow';
  if (key < endKey) return 'thisWeek';
  return 'later';
}

export function etTimeLabel(iso) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(iso)).replace(':00 ', ' ');
}

export function etWeekdayDateLabel(iso) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date(iso));
}

export function etNowMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const mi = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + mi;
}
