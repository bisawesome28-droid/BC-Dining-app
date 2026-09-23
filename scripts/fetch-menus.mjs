// Fetches BC Dining's real, live menu JSON and transforms it into this repo's
// menus.json. Run by .github/workflows/update-menus.yml on a schedule — never
// run in the browser (that's blocked by CORS; see the workflow file for why
// this has to be a server-side job instead of a client-side fetch).
//
// Source: the same two flat JSON files BC's own dining-menus.html page reads
// (found by inspecting their bc-dining-menus.js), checked September 2026:
//   https://web.bc.edu/dining/menu/todayMenu_PROD.json
//   https://web.bc.edu/dining/menu/futureMenu_PROD.json
//
// NO-FABRICATION RULE: this script only ever relays what BC's own feed says.
// If a location in our data.js can't be confidently matched to a Location_Name
// in the feed, it's left out of menus.json (and listed in unmatchedLocations
// for visibility) rather than guessed at. If the fetch fails outright, the
// script exits non-zero and leaves the previously-committed menus.json
// untouched — a failed run should never overwrite good data with nothing.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const DATA_URL_1 = 'https://web.bc.edu/dining/menu/todayMenu_PROD.json';
const DATA_URL_2 = 'https://web.bc.edu/dining/menu/futureMenu_PROD.json';

// Candidate name fragments per location id, matched case-insensitively as a
// substring either direction against the feed's Location_Name. Derived from
// data.js's own name/place fields, since the feed tends to use a location's
// full/official name (closer to `place`) rather than our short display name.
// Only dining halls and cafés are listed — rec centers/mailroom never have a
// food menu, so they're intentionally absent and always skipped.
const LOCATION_ALIASES = {
  lower: ['lower live', 'lower'],
  mac: ['carney', 'mac'],
  rat: ['welch', 'the rat', 'rat', 'lyons'],
  addies: ["addie's", 'addies', 'loft at addie'],
  brookline: ['brookline', 'messina'],
  faculty: ['faculty dining', 'faculty'],
  hillside: ['hillside'],
  haley: ['haley'],
  chocolate: ['chocolate bar', 'chocolate'],
  coro: ['coro'],
  nest: ["eagle's nest", 'eagles nest'],
  market: ['the market', 'market'],
  bean: ['bean counter', 'bean'],
  tully: ['tully'],
  c129: ['cafe 129', 'café 129', '129'],
  stuart: ['stuart'],
  legal: ['legal grounds', 'legal']
};

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchLocationId(rawLocationName) {
  const norm = normalize(rawLocationName);
  for (const [id, aliases] of Object.entries(LOCATION_ALIASES)) {
    for (const alias of aliases) {
      const a = normalize(alias);
      if (norm.includes(a) || a.includes(norm)) return id;
    }
  }
  return null;
}

// Feed dates are "MM/DD/YYYY" strings (confirmed from bc-dining-menus.js's
// own date-option formatting: now.format("MM/DD/YYYY")) — convert to this
// app's "YYYY-MM-DD" key format (hours.js's dateKey()).
function toDateKey(mmddyyyy) {
  const [m, d, y] = String(mmddyyyy).split('/');
  if (!m || !d || !y) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

function itemKey(item) {
  return [item.Location_Number, item.Serve_Date, item.Meal_Number, item.Menu_Category_Number, item.Recipe_Number].join('|');
}

async function main() {
  const [today, future] = await Promise.all([fetchJSON(DATA_URL_1), fetchJSON(DATA_URL_2)]);
  if (!Array.isArray(today) || !Array.isArray(future)) {
    throw new Error('Unexpected response shape — expected two JSON arrays');
  }

  const seen = new Set();
  const allItems = [];
  for (const item of today.concat(future)) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    allItems.push(item);
  }

  const locations = {}; // locationId -> dateKey -> [{ meal, categories: [{ category, items: [{ name, calories, allergens }] }] }]
  const unmatchedCounts = {}; // raw Location_Name -> item count, for anything we couldn't map

  // Intermediate grouping keyed by locationId -> dateKey -> mealName -> categoryName -> items[]
  const grouped = {};

  for (const item of allItems) {
    const locId = matchLocationId(item.Location_Name);
    if (!locId) {
      unmatchedCounts[item.Location_Name] = (unmatchedCounts[item.Location_Name] || 0) + 1;
      continue;
    }
    const dateKey = toDateKey(item.Serve_Date);
    if (!dateKey) continue;
    const mealName = item.Meal_Name || 'Meal';
    const categoryName = item.Menu_Category_Name || 'Menu';
    const name = item.Recipe_Print_As_Name;
    if (!name) continue;

    grouped[locId] ??= {};
    grouped[locId][dateKey] ??= {};
    grouped[locId][dateKey][mealName] ??= {};
    grouped[locId][dateKey][mealName][categoryName] ??= [];
    grouped[locId][dateKey][mealName][categoryName].push({
      name,
      calories: item.Calories || null,
      allergens: item.Allergens || null
    });
  }

  for (const [locId, byDate] of Object.entries(grouped)) {
    locations[locId] = {};
    for (const [dateKey, byMeal] of Object.entries(byDate)) {
      locations[locId][dateKey] = Object.entries(byMeal).map(([meal, byCategory]) => ({
        meal,
        categories: Object.entries(byCategory).map(([category, items]) => ({ category, items }))
      }));
    }
  }

  const unmatchedLocations = Object.entries(unmatchedCounts).map(([name, itemCount]) => ({ name, itemCount }));

  const out = {
    generatedAt: new Date().toISOString(),
    locations,
    unmatchedLocations
  };

  writeFileSync(join(REPO_ROOT, 'menus.json'), JSON.stringify(out));
  console.log(`Wrote menus.json — ${Object.keys(locations).length} matched location(s), ${unmatchedLocations.length} unmatched name(s).`);
  if (unmatchedLocations.length) {
    console.log('Unmatched Location_Name values (check LOCATION_ALIASES in this script):', unmatchedLocations);
  }
}

main().catch((err) => {
  console.error('fetch-menus failed, leaving existing menus.json untouched:', err);
  process.exit(1);
});
