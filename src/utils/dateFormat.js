const TZ = 'Africa/Dar_es_Salaam';

export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: TZ,
  });
}

export function fmtDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ,
  });
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  });
}

export function fmtDateTimeLong(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  });
}

export function fmtTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  });
}

export function nowLocalInput() {
  const d = new Date();
  const eat = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
  const eat0 = new Date(eat.getFullYear(), eat.getMonth(), eat.getDate(), eat.getHours(), eat.getMinutes());
  const pad = n => String(n).padStart(2, '0');
  return `${eat0.getFullYear()}-${pad(eat0.getMonth() + 1)}-${pad(eat0.getDate())}T${pad(eat0.getHours())}:${pad(eat0.getMinutes())}`;
}

export function todayEAT() {
  const d = new Date();
  const eatDate = d.toLocaleDateString('en-CA', { timeZone: TZ });
  return eatDate;
}
