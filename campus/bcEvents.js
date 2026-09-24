// BC Events (Localist) adapter — fetched live, client-side, at runtime.
// Verified reachable with open CORS from this app's own origin (a real
// browser fetch() against https://events.bc.edu/api/2/events succeeded and
// returned genuine JSON — checked manually before this was written; Localist
// widgets are designed for third-party embedding, which is presumably why).
//
// This only ever produces Free Food / Social / Career events — Sports comes
// exclusively from the dedicated BC Athletics source (bcAthletics.js /
// sports.json), even though Athletics events also happen to appear in this
// same Localist calendar (under a "Boston College Athletics" group) — that
// copy is excluded here on purpose, since bcAthletics.js's source is the
// more reliable one for the home/away distinction Sports needs.
import { classifyFreeFood, isSocial, isCareer, isUndergradRelevant } from './classifiers.js';
import { etDateKey } from './dates.js';

const BASE_URL = 'https://events.bc.edu/api/2/events';
const MAX_PAGES = 6; // 100/page, so up to 600 events — well past what a 7-day window needs

async function fetchPage(startKey, page) {
  const url = `${BASE_URL}?start=${startKey}&days=7&pp=100&sort=date&direction=asc&page=${page}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`BC Events responded ${res.status}`);
  return res.json();
}

function stripHtmlFallback(s) {
  // description_text is already plain text from Localist, but this is a
  // defensive fallback in case a future response ever lacks that field.
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeOne(raw, instance) {
  const audienceNames = (raw.filters?.event_audience || []).map((a) => a.name);
  const calendarNames = (raw.filters?.event_university_calendar || []).map((c) => c.name)
    .concat((raw.groups || []).map((g) => g.name));
  const eventTypeNames = (raw.filters?.event_types || []).map((t) => t.name);
  const description = raw.description_text || stripHtmlFallback(raw.description);
  const text = `${raw.title} ${description}`;
  const isVirtual = raw.experience === 'virtual';

  if (!isUndergradRelevant(audienceNames, calendarNames, text)) return null;

  // A ticket_url means Localist requires signing up/registering to attend —
  // "free food" here means walk-up food, so a registration requirement
  // disqualifies it even if the text mentions food being served.
  const requiresRegistration = !!raw.ticket_url;

  const categories = [];
  const food = classifyFreeFood(text);
  let foodConfidence = null;
  if (food && !isVirtual && !requiresRegistration) {
    categories.push('free-food');
    foodConfidence = food;
  }
  if (isSocial(text, eventTypeNames) && !isVirtual) categories.push('social');
  if (isCareer(text, calendarNames)) categories.push('career');
  if (categories.length === 0) return null;

  const location = [raw.room_number, raw.location_name].filter(Boolean).join(', ') || raw.location_name || raw.location || '';

  return {
    id: `bce-${raw.id}-${instance.start}`,
    title: raw.title,
    description,
    startTime: instance.start,
    endTime: instance.end || undefined,
    location: location || undefined,
    venue: raw.location_name || undefined,
    organizer: (raw.groups || [])[0]?.name,
    officialUrl: raw.localist_url,
    registrationUrl: raw.ticket_url || undefined,
    imageUrl: raw.photo_url || undefined,
    categories,
    source: 'bc-events',
    foodConfidence,
    rawEventType: eventTypeNames,
    audience: audienceNames,
    isVirtual
  };
}

export async function fetchCampusEvents(now) {
  const startKey = etDateKey(now);
  const seen = new Set();
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let data;
    try {
      data = await fetchPage(startKey, page);
    } catch (err) {
      // A page failure mid-pagination still returns whatever was already
      // gathered — partial real data beats none, and never fabricated data.
      break;
    }
    const events = data.events || [];
    for (const wrapper of events) {
      const raw = wrapper.event;
      if (!raw) continue;
      const isAthletics = (raw.groups || []).some((g) => g.name === 'Boston College Athletics');
      if (isAthletics) continue;
      for (const inst of raw.event_instances || []) {
        const instance = inst.event_instance;
        if (!instance || !instance.start) continue;
        const key = `${raw.id}-${instance.start}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const normalized = normalizeOne(raw, instance);
        if (normalized) out.push(normalized);
      }
    }
    const hasNext = data.page && data.page.next_page;
    if (!hasNext) break;
  }
  return out;
}
