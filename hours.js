// Formatting and open/closed status logic for a location's posted schedule.

export function fmtTime(m) {
  if (m >= 1440) return 'midnight';
  if (m === 720) return 'noon';
  const h = Math.floor(m / 60), mi = m % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return mi ? `${hh}:${String(mi).padStart(2, '0')} ${ap}` : `${hh} ${ap}`;
}

export function fmtRange(p) {
  return `${fmtTime(p.s)}–${fmtTime(p.e)}`;
}

export function fmtDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// status.kind: 'open' | 'soon' (closes within an hour) | 'later' (opens later today) | 'sched' (future day) | 'closed'
export function statusFor(loc, day, today, nowMins) {
  const ps = loc.days[day] || [];
  const isToday = day === today;

  if (!ps.length) {
    return { kind: 'closed', label: 'Closed', sub: isToday ? 'all day' : 'no service posted', cur: null };
  }
  if (!isToday) {
    const first = ps[0], last = ps[ps.length - 1];
    return {
      kind: 'sched',
      label: `${fmtTime(first.s)}–${fmtTime(last.e)}`,
      sub: ps.length > 1 ? `${ps.length} meal periods` : first.l,
      cur: null
    };
  }
  const cur = ps.find((p) => nowMins >= p.s && nowMins < p.e);
  if (cur) {
    const left = cur.e - nowMins;
    return {
      kind: left <= 60 ? 'soon' : 'open',
      label: left <= 60 ? `Closes in ${fmtDuration(left)}` : 'Open',
      sub: `${cur.l} until ${fmtTime(cur.e)}`,
      cur,
      left
    };
  }
  const next = ps.find((p) => p.s > nowMins);
  if (next) {
    return { kind: 'later', label: `Opens ${fmtTime(next.s)}`, sub: next.l, cur: null, next };
  }
  return { kind: 'closed', label: 'Closed', sub: 'until tomorrow', cur: null };
}

export function rank(st) {
  return st.kind === 'open' ? 0 : st.kind === 'soon' ? 1 : st.kind === 'later' || st.kind === 'sched' ? 2 : 3;
}

export function spanMinutes(periods) {
  return periods.length ? periods.reduce((a, p) => a + (p.e - p.s), 0) : 0;
}
