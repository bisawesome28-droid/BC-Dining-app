import { LOCATIONS, DAY_NAMES, DAY_LETTERS, NOTES } from './data.js';
import { fmtTime, fmtRange, fmtDuration, statusFor, rank, spanMinutes, periodsFor, dateKey } from './hours.js';

const root = document.getElementById('app');

function nowParts() {
  const n = new Date();
  return { now: n.getHours() * 60 + n.getMinutes(), today: n.getDay(), date: n.getDate() };
}

// The day-strip always shows the current real calendar week, so a weekday index
// (0=Sun..6=Sat) maps to one specific date — needed to resolve dated overrides.
function dateKeyForDayIndex(i) {
  const now = new Date();
  return dateKey(new Date(now.getFullYear(), now.getMonth(), state.date - state.today + i));
}

const state = {
  ...nowParts(),
  day: null, // selected weekday index; null = today
  tab: 'today', // 'today' | 'week' | 'notes'
  detailId: null,
  query: '',
  openRows: new Set()
};

function selectedDay() {
  return state.day === null ? state.today : state.day;
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

// ---------- Icons ----------

const icon = {
  info: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(242,243,244,.75)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11.5v5M12 7.8v.6"></path></svg>`,
  search: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(242,243,244,.45)" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg>`,
  today: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v4.8l3.4 2"></path></svg>`,
  week: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"></rect><path d="M3.5 10h17M8.5 3.2v3.4M15.5 3.2v3.4"></path></svg>`,
  notes: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="5" y="3.5" width="14" height="17" rx="3"></rect><path d="M9 9h6M9 13h6M9 17h3"></path></svg>`,
  back: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f2f3f4" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5"></path></svg>`
};

// ---------- Pill styling per status kind ----------

function pillFor(st) {
  if (st.kind === 'open') return { text: 'Open', bg: 'var(--green-wash)', ink: 'var(--green-ink)', dot: 'var(--green)' };
  if (st.kind === 'soon') return { text: 'Closing', bg: 'var(--amber-wash)', ink: 'var(--amber-ink)', dot: 'var(--amber)' };
  if (st.kind === 'later') return { text: `Opens ${fmtTime(st.next.s)}`, bg: 'var(--neutral-wash)', ink: 'rgba(242,243,244,.72)', dot: 'rgba(242,243,244,.62)' };
  if (st.kind === 'sched') return { text: st.label, bg: 'var(--neutral-wash)', ink: 'rgba(242,243,244,.72)', dot: 'rgba(242,243,244,.62)' };
  return { text: 'Closed', bg: 'rgba(255,255,255,.05)', ink: 'rgba(242,243,244,.4)', dot: 'rgba(242,243,244,.18)' };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Row (list item) ----------

function buildRows(list, day, dateStr) {
  return list.map(({ loc, st }) => {
    const p = pillFor(st);
    const isOpen = st.kind === 'open' || st.kind === 'soon';
    const live = st.cur ? (state.now - st.cur.s) / (st.cur.e - st.cur.s) : 0;
    const sub = isOpen
      ? capitalize(st.sub)
      : st.kind === 'later'
        ? `${st.sub} starts ${fmtTime(st.next.s)}`
        : st.kind === 'sched'
          ? st.sub
          : 'No service today';
    const periods = periodsFor(loc, day, dateStr).map((pd) => {
      const cur = day === state.today && state.now >= pd.s && state.now < pd.e;
      return { l: pd.l, range: fmtRange(pd), cur };
    });
    return { loc, st, p, isOpen, live, sub, periods };
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderRow(r) {
  const expanded = state.openRows.has(r.loc.id);
  const barFill = r.st.kind === 'soon' ? '#edb36e' : '#34c759';
  const barW = Math.max(3, Math.min(100, r.live * 100)).toFixed(1) + '%';
  return `
    <button class="row-card${r.isOpen ? ' is-open' : ''}" data-action="open-row" data-id="${r.loc.id}">
      <div class="row-top">
        <div class="row-name-wrap">
          <div class="row-name" style="color:${r.st.kind === 'closed' ? 'rgba(242,243,244,.66)' : '#f2f3f4'}">${esc(r.loc.name)}</div>
          <div class="row-place">${esc(r.loc.place)}</div>
        </div>
        <span class="pill" style="background:${r.p.bg};color:${r.p.ink}">
          <span class="pill-dot" style="background:${r.p.dot}"></span>
          <span class="pill-text">${esc(r.p.text)}</span>
        </span>
      </div>
      <div class="row-sub" style="color:${r.isOpen ? 'rgba(242,243,244,.78)' : 'rgba(242,243,244,.62)'}">${esc(r.sub)}</div>
      ${r.st.cur ? `<div class="row-bar-track"><div class="row-bar-fill" style="width:${barW};background:${barFill}"></div></div>` : ''}
      ${expanded ? renderRowPeriods(r) : ''}
    </button>
  `;
}

function renderRowPeriods(r) {
  if (!r.periods.length) {
    return `<div class="row-periods"><div class="row-empty-note">Nothing posted for ${DAY_NAMES[selectedDay()]}.</div></div>`;
  }
  return `
    <div class="row-periods">
      ${r.periods.map((p) => `
        <div class="row-period" style="background:${p.cur ? 'rgba(235,51,68,.18)' : 'transparent'}">
          <span class="row-period-label" style="color:${p.cur ? '#f2f3f4' : 'rgba(242,243,244,.55)'}">${esc(p.l)}</span>
          <span class="row-period-range" style="color:${p.cur ? '#f2f3f4' : 'rgba(242,243,244,.55)'}">${esc(p.range)}</span>
        </div>
      `).join('')}
      <span class="row-view-week" data-action="open-detail" data-id="${r.loc.id}">View full week &rsaquo;</span>
    </div>
  `;
}

// ---------- Today tab ----------

function computeList(day, dateStr) {
  const q = state.query.trim().toLowerCase();
  let list = LOCATIONS.map((loc) => ({ loc, st: statusFor(periodsFor(loc, day, dateStr), day === state.today, state.now) }));
  if (q) list = list.filter((x) => `${x.loc.name} ${x.loc.place}`.toLowerCase().includes(q));
  list = list.slice().sort((a, b) => rank(a.st) - rank(b.st));
  return list;
}

function renderToday() {
  const day = selectedDay();
  const dateStr = dateKeyForDayIndex(day);
  const list = computeList(day, dateStr);
  const openArr = list.filter((x) => x.st.kind === 'open');
  const soonArr = list.filter((x) => x.st.kind === 'soon');
  const closeNext = openArr.concat(soonArr).sort((a, b) => a.st.cur.e - b.st.cur.e)[0];
  const isToday = day === state.today;

  const headline = isToday ? `${openArr.length + soonArr.length} open now` : DAY_NAMES[day];
  const subline = isToday
    ? (closeNext ? `${closeNext.loc.name} closes in ${fmtDuration(closeNext.st.cur.e - state.now)}` : 'Nothing serving right now')
    : `${list.filter((x) => x.st.kind !== 'closed').length} locations serving`;

  const rec = list.filter((x) => x.loc.group === 'rec');
  const halls = list.filter((x) => x.loc.group === 'hall');
  const cafes = list.filter((x) => x.loc.group === 'cafe');
  const rowsRec = buildRows(rec, day, dateStr);
  const rowsHalls = buildRows(halls, day, dateStr);
  const rowsCafes = buildRows(cafes, day, dateStr);

  const noResults = state.query.trim() && list.length === 0;

  return `
    <div class="header">
      <div class="header-row">
        <div>
          <div class="wordmark">BC Dining</div>
          <div class="headline">${esc(headline)}</div>
          <div class="subline">${esc(subline)}</div>
        </div>
        <button class="icon-btn" data-action="go-tab" data-tab="notes" aria-label="Info">${icon.info}</button>
      </div>
    </div>
    ${renderDayStrip()}
    <div class="search-wrap">
      <div class="search-box">
        ${icon.search}
        <input type="text" placeholder="Search dining" value="${esc(state.query)}" data-action="search" />
      </div>
    </div>
    <div class="body-scroll">
      ${noResults ? `<div class="empty-state">No locations match "${esc(state.query.trim())}".</div>` : `
        ${renderGroup('Recreation', `${rec.filter((x) => x.st.kind !== 'closed').length} open`, rowsRec)}
        ${renderGroup('Dining halls', `${halls.filter((x) => x.st.kind !== 'closed').length} serving`, rowsHalls)}
        ${renderGroup('Cafés & markets', `${cafes.filter((x) => x.st.kind !== 'closed').length} serving`, rowsCafes)}
      `}
      <div class="footnote">Posted schedule, week of September 13. Subject to change.</div>
    </div>
  `;
}

function renderGroup(title, count, rows) {
  if (!rows.length) return '';
  return `
    <div class="group-head">
      <span class="group-title">${esc(title)}</span>
      <span class="group-count">${esc(count)}</span>
    </div>
    <div class="group-list">${rows.map(renderRow).join('')}</div>
  `;
}

function renderDayStrip() {
  const day = selectedDay();
  const sunDate = state.date - state.today;
  return `
    <div class="day-strip">
      ${DAY_LETTERS.map((dow, i) => {
        const selected = i === day;
        const isToday = i === state.today;
        const cls = selected ? 'is-selected' : isToday ? 'is-today' : '';
        return `
          <button class="day-btn ${cls}" data-action="pick-day" data-day="${i}">
            <span class="day-dow">${dow}</span>
            <span class="day-num">${sunDate + i}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

// ---------- Week tab ----------

function renderWeek() {
  const day = selectedDay();
  return `
    <div class="header">
      <div class="header-row">
        <div>
          <div class="wordmark">BC Dining</div>
          <div class="headline">Posted week</div>
          <div class="subline">Hours of service by location and day</div>
        </div>
      </div>
    </div>
    <div class="body-scroll">
      <div class="week-grid">
        <div class="week-head-row">
          <div></div>
          ${DAY_LETTERS.map((dow) => `<div class="week-head-cell">${dow}</div>`).join('')}
        </div>
        ${LOCATIONS.map((loc) => `
          <button class="week-row" data-action="open-detail" data-id="${loc.id}">
            <span class="week-name">${esc(loc.name)}</span>
            ${loc.days.map((ps, i) => {
              ps = periodsFor(loc, i, dateKeyForDayIndex(i));
              const h = spanMinutes(ps) / 60;
              let bg = 'rgba(255,255,255,.04)', ink = 'rgba(242,243,244,.45)', label = '·';
              if (h >= 8) { bg = 'rgba(52,199,89,.85)'; ink = '#08130b'; label = Math.round(h); }
              else if (h >= 4) { bg = 'rgba(52,199,89,.42)'; ink = '#eafff0'; label = Math.round(h); }
              else if (h > 0) { bg = 'rgba(52,199,89,.18)'; ink = 'rgba(234,255,240,.9)'; label = Math.round(h); }
              return `<span class="week-cell" style="background:${bg};color:${ink}">${label}</span>`;
            }).join('')}
          </button>
        `).join('')}
      </div>
      <div class="footnote">Number is hours of posted service. Tap a row to open it.</div>
    </div>
  `;
}

// ---------- Notes tab ----------

function renderNotes() {
  return `
    <div class="header">
      <div class="header-row">
        <div>
          <div class="wordmark">BC Dining</div>
          <div class="headline">Notes</div>
          <div class="subline">How to read the schedule</div>
        </div>
      </div>
    </div>
    <div class="body-scroll">
      <div class="notes-list">
        ${NOTES.map((n) => `
          <div class="note-card">
            <div class="note-key">${esc(n.k)}</div>
            <div class="note-val">${esc(n.v)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------- Detail screen ----------

const GROUP_LABELS = { hall: 'Dining hall', cafe: 'Café & market', rec: 'Recreation' };

// Builds the period-list + posted-week data for one schedule (the location's
// primary schedule, or its `secondary` one, e.g. a climbing wall) on a given day.
function buildScheduleSection(schedule, day, dateStr) {
  const isToday = day === state.today;
  const ps = periodsFor(schedule, day, dateStr);

  const periods = ps.map((pd) => {
    const cur = isToday && state.now >= pd.s && state.now < pd.e;
    const done = isToday && state.now >= pd.e;
    return {
      l: pd.l,
      range: fmtRange(pd),
      state: cur ? 'Open now' : done ? 'Finished' : isToday ? 'Later today' : 'Scheduled',
      bg: cur ? 'rgba(52,199,89,.14)' : 'var(--card)',
      border: cur ? 'rgba(52,199,89,.35)' : 'var(--border)',
      ink: done ? 'rgba(242,243,244,.45)' : '#f2f3f4',
      subColor: cur ? '#5ddc80' : 'rgba(242,243,244,.62)',
      dot: cur ? '#34c759' : done ? 'rgba(242,243,244,.28)' : 'rgba(235,51,68,.8)'
    };
  });

  const spanLine = ps.length ? `Posted ${fmtTime(ps[0].s)} – ${fmtTime(ps[ps.length - 1].e)}` : 'Closed all day';

  const week = schedule.days.map((_, i) => {
    const wps = periodsFor(schedule, i, dateKeyForDayIndex(i));
    return {
      day: DAY_NAMES[i].slice(0, 3),
      range: wps.length ? `${fmtTime(wps[0].s)} – ${fmtTime(wps[wps.length - 1].e)}` : 'Closed',
      meta: wps.length ? `${wps.length} ${wps.length > 1 ? 'periods' : 'period'}` : '—',
      isSel: i === day,
      ink: wps.length ? '#f2f3f4' : 'rgba(242,243,244,.45)'
    };
  });

  return { periods, spanLine, week };
}

function renderScheduleBlock(title, section, day) {
  const isToday = day === state.today;
  return `
    ${title ? `<div class="detail-section-title" style="padding:0 4px 10px">${esc(title)}</div>` : ''}
    <div class="detail-section-head">
      <span class="detail-section-title">${isToday ? 'Today · ' : ''}${DAY_NAMES[day]}</span>
      <span class="detail-section-meta">${esc(section.spanLine)}</span>
    </div>
    <div class="period-list">
      ${section.periods.length ? section.periods.map((pd) => `
        <div class="period-card" style="background:${pd.bg};border-color:${pd.border}">
          <div class="period-left">
            <span class="period-dot" style="background:${pd.dot}"></span>
            <div>
              <div class="period-name" style="color:${pd.ink}">${esc(pd.l)}</div>
              <div class="period-state" style="color:${pd.subColor}">${esc(pd.state)}</div>
            </div>
          </div>
          <span class="period-range" style="color:${pd.ink}">${esc(pd.range)}</span>
        </div>
      `).join('') : `<div class="empty-state" style="padding:24px 0">Nothing posted for ${DAY_NAMES[day]}.</div>`}
    </div>
    <div class="posted-week-title">Posted week</div>
    <div class="posted-week">
      ${section.week.map((w) => `
        <div class="posted-week-row" style="background:${w.isSel ? 'rgba(235,51,68,.12)' : 'transparent'};border-left-color:${w.isSel ? '#eb3344' : 'transparent'}">
          <span class="posted-week-day" style="color:${w.ink}">${w.day}</span>
          <span class="posted-week-meta">${esc(w.meta)}</span>
          <span class="posted-week-range" style="color:${w.ink}">${esc(w.range)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDetail(id) {
  const loc = LOCATIONS.find((l) => l.id === id);
  const day = selectedDay();
  const dateStr = dateKeyForDayIndex(day);
  const st = statusFor(periodsFor(loc, day, dateStr), day === state.today, state.now);
  const p = pillFor(st);

  const statusLine = st.kind === 'closed'
    ? `No service posted for ${DAY_NAMES[day]}`
    : st.kind === 'open' || st.kind === 'soon'
      ? capitalize(st.sub)
      : st.kind === 'later'
        ? `${st.sub} starts ${fmtTime(st.next.s)}`
        : st.label;

  const primary = buildScheduleSection(loc, day, dateStr);
  const secondary = loc.secondary ? buildScheduleSection(loc.secondary, day, dateStr) : null;

  const activeOverride = loc.overrides && loc.overrides[dateStr];
  const noteText = (activeOverride && activeOverride.note) || loc.note;

  return `
    <div class="detail-topbar">
      <button class="back-btn" data-action="close-detail" aria-label="Back">${icon.back}</button>
      <span class="detail-group-label">${esc(GROUP_LABELS[loc.group] || loc.group)}</span>
    </div>
    <div class="detail-head">
      <div class="detail-name">${esc(loc.name)}</div>
      <div class="detail-place">${esc(loc.place)}</div>
      <div class="detail-tags">
        <span class="pill" style="background:${p.bg};color:${p.ink}">
          <span class="pill-dot" style="background:${p.dot}"></span>
          <span class="pill-text">${esc(p.text)}</span>
        </span>
        <span class="detail-status-line">${esc(statusLine)}</span>
      </div>
    </div>
    ${renderDayStrip()}
    <div class="body-scroll">
      ${renderScheduleBlock(secondary ? loc.name : '', primary, day)}
      ${noteText ? `<div class="note-callout">${esc(noteText)}</div>` : ''}
      ${secondary ? `<div style="height:22px"></div>${renderScheduleBlock(loc.secondary.title, secondary, day)}` : ''}
      <div class="footnote">Source: posted BC schedule, week of September 13, 2026. Subject to change; break and exam periods differ.</div>
    </div>
  `;
}

// ---------- Tab bar ----------

function renderTabBar() {
  const tabs = [
    { key: 'today', label: 'Today', icon: icon.today },
    { key: 'week', label: 'Week', icon: icon.week },
    { key: 'notes', label: 'Notes', icon: icon.notes }
  ];
  return `
    <div class="tab-bar">
      ${tabs.map((t) => `
        <button class="tab-btn${state.tab === t.key ? ' is-active' : ''}" data-action="go-tab" data-tab="${t.key}">
          ${t.icon}
          <span class="tab-label">${t.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

// ---------- Root render ----------

function render() {
  // Only the search box should ever grab focus, and only if it already had it
  // (e.g. the user is mid-keystroke) — never as a side effect of tapping something else.
  const active = document.activeElement;
  const restoreSearchFocus = !!(active && active.dataset && active.dataset.action === 'search');
  const selStart = restoreSearchFocus ? active.selectionStart : null;
  const selEnd = restoreSearchFocus ? active.selectionEnd : null;

  let body;
  if (state.detailId) {
    body = renderDetail(state.detailId);
  } else if (state.tab === 'week') {
    body = renderWeek() + renderTabBar();
  } else if (state.tab === 'notes') {
    body = renderNotes() + renderTabBar();
  } else {
    body = renderToday() + renderTabBar();
  }
  root.innerHTML = body;
  attachHandlers();

  if (restoreSearchFocus) {
    const input = root.querySelector('[data-action="search"]');
    if (input) {
      input.focus();
      if (selStart !== null) input.setSelectionRange(selStart, selEnd);
    }
  }
}

function attachHandlers() {
  root.querySelectorAll('[data-action]').forEach((el) => {
    const action = el.dataset.action;
    if (action === 'search') {
      el.addEventListener('input', (e) => setState({ query: e.target.value }));
      return;
    }
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (action === 'pick-day') setState({ day: Number(el.dataset.day) });
      else if (action === 'go-tab') setState({ tab: el.dataset.tab, detailId: null });
      else if (action === 'open-detail') setState({ detailId: el.dataset.id });
      else if (action === 'close-detail') setState({ detailId: null });
      else if (action === 'open-row') {
        const id = el.dataset.id;
        const next = new Set(state.openRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setState({ openRows: next });
      }
    });
  });
}

// Live clock — recompute status every 30s, matching the original design.
setInterval(() => {
  Object.assign(state, nowParts());
  render();
}, 30000);

render();

// Register service worker for offline + installable use.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
