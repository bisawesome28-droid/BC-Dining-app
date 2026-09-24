// Deterministic, keyword/rule-based classification for Campus Activities.
// No AI/LLM call happens here or anywhere at runtime — every decision below
// is explainable from the rules in this file. Edit these lists to tune
// behavior; nothing else in the app needs to change.

// ---------- Free Food ----------

// Any of these appearing in the title/description is a confident, explicit
// claim that food is provided — not just discussed.
const STRONG_FOOD_PHRASES = [
  'free food', 'free pizza', 'free lunch', 'free dinner', 'free breakfast',
  'lunch provided', 'dinner provided', 'breakfast provided', 'food provided',
  'food will be provided', 'pizza provided', 'pizza will be served',
  'refreshments provided', 'refreshments will be served', 'snacks provided',
  'meal provided', 'complimentary food', 'complimentary lunch',
  'complimentary dinner', 'food and drinks', 'food and refreshments',
  'food will be served'
];

// Flexible strong-signal patterns — catches word-order variants a plain
// substring list would miss (e.g. "we will be providing the main food").
const STRONG_FOOD_PATTERNS = [
  /\bprovid(e|es|ed|ing)\b[^.]{0,30}\bfood\b/i,
  /\bfood\b[^.]{0,20}\bprovided\b/i
];

// Weaker, contextual food words — only counted as food when the surrounding
// text isn't clearly about food as a topic of study/discussion rather than
// something being served. "food," / "food and" catches a party-style list
// ("Food, music, games and prizes") without matching bare "food" generally.
const LIKELY_FOOD_WORDS = [
  'pizza', 'ice cream', 'bbq', 'barbecue', 'breakfast', 'brunch', 'lunch',
  'dinner', 'dessert', 'snacks', 'refreshments', 'pastries', 'treats',
  'picnic', 'potluck', 'reception', 'food,', 'food and', 'food will'
];

// Phrases that mean the text is ABOUT food/nutrition as a subject, not
// serving it — these override a LIKELY_FOOD_WORDS hit in the same text.
const FOOD_TOPIC_EXCLUSIONS = [
  'food insecurity', 'food industry', 'food system', 'food systems',
  'nutrition research', 'nutrition seminar', 'agricultural', 'food policy',
  'food science', 'food studies', 'careers in food', 'careers in the food'
];

export function classifyFreeFood(text) {
  const t = text.toLowerCase();
  if (STRONG_FOOD_PHRASES.some((p) => t.includes(p))) return 'strong';
  if (STRONG_FOOD_PATTERNS.some((re) => re.test(t))) return 'strong';
  const hasTopicExclusion = FOOD_TOPIC_EXCLUSIONS.some((p) => t.includes(p));
  if (!hasTopicExclusion && LIKELY_FOOD_WORDS.some((w) => t.includes(w))) return 'likely';
  return null;
}

// ---------- Social ----------

// Localist's own "Social" event_type name, when present, is treated as a
// strong positive on its own (see isSocial below).
// Deliberately specific phrases only — a bare word like "social" would false
// -positive on things like "Social Impact Careers" or "Social Work Panel",
// which are academic/career topics, not campus social events.
const SOCIAL_KEYWORDS = [
  'trivia night', 'trivia', 'bingo night', 'movie night', 'game night',
  'dance', 'concert', 'celebration', 'festival', 'mixer', 'picnic',
  'ice cream social', 'watch party', 'karaoke night', 'carnival',
  'block party', 'semi-formal', 'social hour', 'game day', 'field day'
];

const SOCIAL_EXCLUSIONS = [
  'lecture', 'seminar', 'colloquium', 'faculty development', 'workshop',
  'panel discussion', 'research presentation', 'graduate program',
  'admissions information', 'orientation session', 'town hall'
];

export function isSocial(text, eventTypeNames) {
  const types = (eventTypeNames || []).map((n) => n.toLowerCase());
  if (types.includes('social')) return true;
  const t = text.toLowerCase();
  if (SOCIAL_EXCLUSIONS.some((p) => t.includes(p))) return false;
  return SOCIAL_KEYWORDS.some((w) => t.includes(w));
}

// ---------- Career ----------

const CAREER_KEYWORDS = [
  'career fair', 'employer information session', 'info session', 'recruiting',
  'networking night', 'networking event', 'alumni panel', 'resume workshop',
  'resume review', 'resume', 'interview workshop', 'internship', 'job search',
  'career trek', 'industry panel', 'career center', 'job or internship',
  'employer visit', 'employer', 'career panel', 'professional development'
];

const CAREER_CALENDAR_NAMES = ['career center', "boston college career center"];

const CAREER_EXCLUSIONS = [
  'law students only', '1l', '2l', '3l', 'mba only', 'mba-only',
  'graduate admissions', 'phd only', 'faculty only', 'staff only',
  'boston college law school'
];

export function isCareer(text, calendarNames) {
  const t = text.toLowerCase();
  if (CAREER_EXCLUSIONS.some((p) => t.includes(p))) return false;
  const cals = (calendarNames || []).map((n) => n.toLowerCase());
  if (cals.some((c) => CAREER_CALENDAR_NAMES.some((k) => c.includes(k)))) return true;
  return CAREER_KEYWORDS.some((w) => t.includes(w));
}

// ---------- Undergraduate relevance ----------

const POSITIVE_AUDIENCE = ['undergraduate students', 'students', 'all students', 'bc community', 'public'];
const NEGATIVE_AUDIENCE_TEXT = [
  'law school-only', 'law students only', 'jd-only', 'jd only',
  '1l-specific', '2l-specific', '3l-specific', 'mba-only', 'mba only',
  'mba students', 'mba program', 'mba candidates', 'full-time mba',
  'graduate admission', 'phd-only', 'phd only', 'faculty-only', 'faculty only',
  'staff-only', 'staff only',
  'international student support group', 'international students only',
  'off-campus students', 'off campus students', 'commuter students',
  'commuter student'
];
// Every entity in this list is a fully separate group from BC's on-campus
// undergrad population (grad business students, international-student-only
// support services, or students who live off campus) — an event whose ONLY
// audience tags fall in here is not relevant to the general on-campus
// undergrad feed this tab serves.
const NARROW_AUDIENCE_NAMES = [
  'graduate students', 'faculty/staff', 'alumni', 'parents',
  'mba students', 'international students', 'off-campus students',
  'commuter students'
];

// True unless the event is clearly restricted away from undergrads — an
// event with no audience metadata at all is NOT excluded just for that,
// only when there's an actual negative signal (calendar name, audience list
// that is exclusively grad/faculty, or restrictive text).
export function isUndergradRelevant(audienceNames, calendarNames, text) {
  const t = text.toLowerCase();
  if (NEGATIVE_AUDIENCE_TEXT.some((p) => t.includes(p))) return false;
  const cals = (calendarNames || []).map((n) => n.toLowerCase());
  if (cals.some((c) => c.includes('law school'))) return false;

  const names = (audienceNames || []).map((n) => n.toLowerCase());
  if (names.length === 0) return true; // no metadata — don't exclude on absence alone
  if (names.some((n) => POSITIVE_AUDIENCE.includes(n))) return true;
  // Metadata exists but names only grad/faculty/staff/alumni/parents/etc. — not relevant.
  const onlyNarrow = names.every((n) => NARROW_AUDIENCE_NAMES.includes(n));
  return !onlyNarrow;
}
