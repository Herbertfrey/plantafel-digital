// Kleine Hilfsfunktionen, überall nutzbar

function formatDate(d) {
  if (!d) return "";
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return "";
  return dt.toLocaleDateString("de-DE");
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function dateFromIsoWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4 && dow > 0) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  ISOweekStart.setHours(0, 0, 0, 0);
  return ISOweekStart;
}

function addDays(d, days) {
  const dt = new Date(d.getTime());
  dt.setDate(dt.getDate() + days);
  return dt;
}

function normalizeName(name) {
  if (!name) return "";
  return name.trim().toLowerCase();
}

function normalizeFirstFromList(listStr) {
  if (!listStr) return "";
  const first = listStr.split(",")[0];
  return normalizeName(first);
}
