// Fetches BC Athletics' real combined schedule feed (every varsity sport,
// discovered dynamically from each event's own title — no hardcoded sport
// list) and republishes only genuine home events as sports.json.
//
// Source, verified reachable server-side (browser fetch() from the deployed
// app failed with a CORS error — confirmed by testing directly — so this
// has to run here, same reasoning as scripts/fetch-menus.mjs):
//   https://bceagles.com/api/v2/Calendar/subscribe?type=ics
//
// NO-FABRICATION RULE: home/away comes straight from BC's own "vs"/"at"
// convention in each event's title, confirmed against real venue names in
// the LOCATION field — never guessed. An event is only "home" when BOTH are
// true. Postponed games are dropped rather than guessed at. A failed fetch
// leaves the previously-committed sports.json untouched.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const FEED_URL = 'https://bceagles.com/api/v2/Calendar/subscribe?type=ics';

// Real BC on-campus venue names, taken directly from LOCATION fields
// observed in the actual feed — a "vs" event only counts as a home event
// when its LOCATION also matches one of these, so an away tournament that
// happens to say "vs" (e.g. a golf/sailing meet BC is entered in, hosted
// elsewhere) never gets counted as a campus home event.
const HOME_VENUE_KEYWORDS = [
  'alumni stadium',
  'conte forum',
  'newton campus',
  'margot connell recreation center',
  'field hockey complex',
  'warrior ice arena'
];

function unescapeIcsText(s) {
  return String(s || '')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\n/g, ' ')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseIcsDate(value, isAllDay) {
  if (isAllDay) {
    // "20261025" -> a plain calendar date, no real clock time attached.
    const y = value.slice(0, 4), m = value.slice(4, 6), d = value.slice(6, 8);
    return `${y}-${m}-${d}T00:00:00.000Z`;
  }
  // "20260926T160000Z" -> standard UTC instant.
  const y = value.slice(0, 4), m = value.slice(4, 6), d = value.slice(6, 8);
  const hh = value.slice(9, 11), mm = value.slice(11, 13), ss = value.slice(13, 15) || '00';
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
}

function parseIcs(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const fields = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const rawKey = line.slice(0, idx);
      const value = line.slice(idx + 1);
      const [key, ...params] = rawKey.split(';');
      fields[key] = { value, isAllDay: params.some((p) => p === 'VALUE=DATE') };
    }
    if (!fields.SUMMARY || !fields.DTSTART) continue;
    events.push({
      uid: fields.UID?.value,
      summary: unescapeIcsText(fields.SUMMARY.value),
      location: unescapeIcsText(fields.LOCATION?.value),
      url: fields.URL?.value,
      startRaw: fields.DTSTART.value,
      endRaw: fields.DTEND?.value,
      isAllDay: fields.DTSTART.isAllDay
    });
  }
  return events;
}

function cleanLocation(loc) {
  // SIDEARM's LOCATION sometimes has a leading ", " when the city/state part
  // is blank (e.g. ", Conte Forum") — strip that artifact for display.
  return (loc || '').replace(/^,\s*/, '').trim();
}

const SPORT_MATCH = /^Boston College\s+(.+?)\s+(vs|at)\s+(.+)$/i;

function parseTitle(rawSummary) {
  // Drop result-prefix tags ([W]/[L]/[T]/[N]) and postponed games entirely —
  // a postponed game's real new date/time isn't in this record, so showing
  // the old one would be showing something false.
  if (/^POSTPONED\b/i.test(rawSummary)) return null;
  const cleaned = rawSummary.replace(/^\[(W|L|T|N)\]\s*/i, '').trim();
  const m = cleaned.match(SPORT_MATCH);
  if (!m) return null;
  const [, sportName, homeAway, rest] = m;
  const dashIdx = rest.indexOf('-');
  const opponent = (dashIdx >= 0 ? rest.slice(0, dashIdx) : rest).trim();
  const note = dashIdx >= 0 ? rest.slice(dashIdx + 1).trim() : null;
  return { sportName: sportName.trim(), homeAway, opponent, note };
}

async function main() {
  const res = await fetch(FEED_URL, { headers: { accept: 'text/calendar' } });
  if (!res.ok) throw new Error(`BC Athletics feed responded ${res.status}`);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Unexpected response — not an ICS calendar');

  const rawEvents = parseIcs(text);
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000; // drop anything more than 2 days stale
  const out = [];

  for (const raw of rawEvents) {
    const parsed = parseTitle(raw.summary);
    if (!parsed) continue;
    if (parsed.homeAway.toLowerCase() !== 'vs') continue;
    const location = cleanLocation(raw.location);
    const isHomeVenue = HOME_VENUE_KEYWORDS.some((v) => location.toLowerCase().includes(v));
    if (!isHomeVenue) continue;

    const startTime = parseIcsDate(raw.startRaw, raw.isAllDay);
    if (new Date(startTime).getTime() < cutoff) continue;
    const endTime = raw.endRaw ? parseIcsDate(raw.endRaw, raw.isAllDay) : undefined;

    out.push({
      id: `bca-${raw.uid}`,
      title: `${parsed.sportName} vs ${parsed.opponent}`,
      description: parsed.note || '',
      startTime,
      endTime,
      location,
      venue: location,
      organizer: 'Boston College Athletics',
      officialUrl: (raw.url || '').replace(/&amp;/g, '&'),
      categories: ['sports'],
      source: 'bc-athletics',
      sportName: parsed.sportName,
      opponent: parsed.opponent,
      isHomeEvent: true,
      isAllDay: raw.isAllDay
    });
  }

  writeFileSync(join(REPO_ROOT, 'sports.json'), JSON.stringify({ generatedAt: new Date().toISOString(), events: out }));
  console.log(`Wrote sports.json — ${out.length} upcoming home event(s) across ${new Set(out.map((e) => e.sportName)).size} sport(s).`);
}

main().catch((err) => {
  console.error('fetch-sports failed, leaving existing sports.json untouched:', err);
  process.exit(1);
});
