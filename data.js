// BC Dining Hours — posted schedule, week of September 13, 2026.
// Newton Campus (Stuart Dining Hall, Legal Grounds) intentionally excluded.
// Source: BC_Dining_Hours_No_Newton.pdf

const T = (s) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};
const P = (l, a, b) => ({ l, s: T(a), e: T(b) });
const L = (id, name, place, group, days, note, extra) => ({ id, name, place, group, days, note, ...(extra || {}) });

const lowWk = [P('Continental', '6:30', '7:30'), P('Breakfast', '7:30', '10:30'), P('Lunch', '11:00', '15:00'), P('Grab & go', '15:00', '16:15'), P('Dinner', '16:45', '20:30')];
const lowWe = [P('Breakfast', '8:00', '11:00'), P('Lunch', '11:00', '15:00'), P('Grab & go', '15:00', '16:15'), P('Dinner', '16:45', '20:30')];
const macWk = [P('Breakfast', '7:30', '10:30'), P('Lunch', '11:00', '14:30'), P('Lite fare', '14:30', '16:00'), P('Dinner', '16:30', '20:00')];
const macWe = [P('Breakfast', '9:00', '11:00'), P('Lunch', '11:00', '14:30'), P('Lite fare', '14:30', '16:00'), P('Dinner', '16:30', '20:00')];
const addie = [P('Dinner', '17:00', '21:00')];
const ratDay = [P('Breakfast', '8:00', '11:00'), P('Lunch', '11:00', '15:00')];
const ratLate = ratDay.concat([P('Late night', '19:00', '24:00')]);
const brWk = [P('Breakfast', '8:00', '10:30'), P('Lunch', '11:00', '15:00'), P('Grab & go', '16:30', '17:00'), P('Dinner', '17:00', '20:00')];
const brWe = [P('Brunch', '10:00', '15:00'), P('Grab & go', '15:00', '16:00'), P('Dinner', '16:00', '19:00')];
const fac = [P('Lunch', '11:30', '13:30')];
const hillMt = [P('Breakfast', '7:30', '11:00'), P('Lite fare', '11:00', '11:30'), P('Lunch', '11:30', '15:00'), P('Coffee & snacks', '15:00', '18:00')];
const hillFr = [P('Breakfast', '7:30', '11:00'), P('Lite fare', '11:00', '11:30'), P('Lunch', '11:00', '18:00')];
const haley = [P('Dinner', '16:30', '20:30')];
const cb = [P('Open', '8:00', '18:00')], cbF = [P('Open', '8:00', '15:00')];
const coro = [P('Open', '8:00', '19:00')], coroF = [P('Open', '8:00', '15:00')], coroSa = [P('Open', '11:00', '16:00')], coroSu = [P('Open', '12:00', '19:00')];
const nest = [P('Lunch', '11:00', '15:30')];
const mkt = [P('Open', '8:00', '19:00')], mktF = [P('Open', '8:00', '15:00')], mktWe = [P('Open', '10:00', '15:00')];
const bean = [P('Open', '10:00', '14:00'), P('Open', '15:45', '20:00')];
const tully = [P('Breakfast & lunch', '9:00', '16:00')], tullyF = [P('Breakfast & lunch', '9:00', '15:00')];
const c129 = [P('Lunch', '11:30', '13:30')];
const X = [];

// Margot Connell Recreation Center + Climbing Wall / Outdoor Adventures Center
// Source: BC_Rec_and_Climbing_Default_Hours.pdf, verified September 17, 2026
const recWk = [P('Open', '6:00', '23:45')];
const recFri = [P('Open', '6:00', '22:45')];
const recSat = [P('Open', '9:00', '20:45')];
const recSun = [P('Open', '9:00', '22:45')];
const climbWk = [P('Open', '12:00', '20:00')];
const climbWed = [P('Open', '12:00', '22:00')];
const climbFri = [P('Open', '11:00', '18:00')];

// days[] is indexed Sun=0 .. Sat=6
export const LOCATIONS = [
  L('rec', 'Margot Connell Recreation Center', 'Flynn Recreation Complex', 'rec',
    [recSun, recWk, recWk, recWk, recWk, recFri, recSat],
    undefined,
    {
      secondary: {
        title: 'Climbing Wall · Outdoor Adventures Center',
        days: [X, climbWk, climbWk, climbWed, climbWk, climbFri, X]
      },
      overrides: {
        '2026-09-19': {
          periods: [P('Open', '9:00', '13:00')],
          note: 'Special hours today: the recreation center closes at 1 pm, and the climbing wall is closed for the day.'
        }
      }
    }),
  L('lower', 'Lower', 'Lower Live · Corcoran Commons', 'hall', [lowWe, lowWk, lowWk, lowWk, lowWk, lowWk, lowWe]),
  L('mac', 'Mac', 'Carney Dining Room · McElroy', 'hall', [macWe, macWk, macWk, macWk, macWk, macWk, macWe]),
  L('rat', 'The Rat', 'Welch Dining Room · Lyons Hall', 'hall', [[P('Late night', '19:00', '24:00')], ratLate, ratLate, ratLate, ratLate, ratDay, X], 'No late-night service on Friday or Saturday.'),
  L('addies', "Addie's", "The Loft at Addie's · Corcoran", 'hall', [addie, addie, addie, addie, addie, X, X]),
  L('brookline', 'Brookline', 'Messina College · Brookline', 'hall', [brWe, brWk, brWk, brWk, brWk, brWk, brWe]),
  L('faculty', 'Faculty Dining', 'McElroy Commons', 'hall', [X, fac, fac, fac, fac, fac, X]),
  L('hillside', 'Hillside Café', 'Maloney Hall', 'cafe', [X, hillMt, hillMt, hillMt, hillMt, hillFr, X], 'Friday lunch is posted 11 am–6 pm, overlapping lite fare and coffee.'),
  L('haley', 'Haley Janes', 'At Hillside · Maloney Hall', 'cafe', [X, haley, haley, haley, haley, X, X]),
  L('chocolate', 'Chocolate Bar', 'Stokes Hall', 'cafe', [X, cb, cb, cb, cb, cbF, X]),
  L('coro', 'CoRo Café', 'College Road · McElroy', 'cafe', [coroSu, coro, coro, coro, coro, coroF, coroSa]),
  L('nest', "Eagle's Nest", 'McElroy Commons', 'cafe', [X, nest, nest, nest, nest, nest, X]),
  L('market', 'The Market', 'Corcoran Commons', 'cafe', [mktWe, mkt, mkt, mkt, mkt, mktF, mktWe]),
  L('bean', 'Bean Counter', 'Fulton Hall', 'cafe', [X, bean, bean, bean, bean, X, X]),
  L('tully', 'Tully Family Café', '245 Beacon Street', 'cafe', [X, tully, tully, tully, tully, tullyF, X]),
  L('c129', 'Café 129', '129 Lake Street · Brighton', 'cafe', [X, X, c129, c129, c129, X, X])
];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const NOTES = [
  { k: 'Recreation hours', v: 'The Margot Connell Recreation Center and its climbing wall run on separate schedules — the default weekly pattern is verified against BC’s posted calendars, not a live feed.' },
  { k: 'Meal periods', v: 'Periods are listed separately. A gap between them is not confirmed service — the line closes and reopens.' },
  { k: 'Midnight', v: 'Late-night service listed to midnight ends at the close of the listed day.' },
  { k: 'Newton', v: 'Stuart Dining Hall and Legal Grounds on Newton Campus are not included.' },
  { k: 'Breaks & exams', v: 'This is the regular weekly schedule. Break, holiday and exam periods run shortened hours.' },
  { k: 'Hillside Friday', v: 'BC posts Friday lunch as 11 am–6 pm, overlapping lite fare and coffee. The published entries are kept as-is.' },
  { k: 'Source', v: 'Posted BC Dining schedule, week of September 13, 2026. Subject to change.' }
];
