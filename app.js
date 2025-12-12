const form = document.getElementById("plantafel-form");

const kwEl = document.getElementById("kw");
const weekdayEl = document.getElementById("weekday");
const titelEl = document.getElementById("titel");
const baustelleEl = document.getElementById("baustelle");
const mitarbeiterEl = document.getElementById("mitarbeiter");
const fahrzeugEl = document.getElementById("fahrzeug");
const statusEl = document.getElementById("status");
const notizEl = document.getElementById("notiz");

const reloadBtn = document.getElementById("reloadBtn");
const clearBtn = document.getElementById("clearBtn");

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

function isoWeekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function clearBoard() {
  for (const day of DAYS) {
    const col = document.getElementById(`col-${day}`);
    if (col) col.innerHTML = "";
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCard(row) {
  const div = document.createElement("div");
  div.className = `card ${row.status || "normal"}`;
  div.draggable = true;
  div.dataset.id = row.id;

  const title = escapeHtml(row.titel || "(ohne Titel)");
  const baustelle = escapeHtml(row.baustelle || "");
  const mitarbeiter = escapeHtml(row.mitarbeiter || "");
  const fahrzeug = escapeHtml(row.fahrzeug || "");
  const notiz = escapeHtml(row.notiz || "");

  div.innerHTML = `
    <div class="title">${title}</div>
    <div class="meta">
      ${baustelle ? `<div><b>Baustelle:</b> ${baustelle}</div>` : ""}
      ${mitarbeiter ? `<div><b>Mitarbeiter:</b> ${mitarbeiter}</div>` : ""}
      ${fahrzeug ? `<div><b>Fahrzeug:</b> ${fahrzeug}</div>` : ""}
      ${notiz ? `<div><b>Notiz:</b> ${notiz}</div>` : ""}
    </div>
  `;

  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", row.id);
    e.dataTransfer.effectAllowed = "move";
  });

  return div;
}

async function loadData() {
  if (!window.db) {
    alert("Supabase ist nicht verbunden. Bitte SUPABASE_URL und ANON_KEY in supabase.js eintragen.");
    return;
  }

  const kw = Number(kwEl.value);
  if (!kw || kw < 1 || kw > 53) {
    clearBoard();
    return;
  }

  clearBoard();

  const { data, error } = await window.db
    .from("plantafel")
    .select("*")
    .eq("kw", kw)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    alert("Fehler beim Laden ❌ (Console anschauen)");
    return;
  }

  for (const row of (data || [])) {
    const day = row.weekday;
    if (!DAYS.includes(day)) continue;
    const col = document.getElementById(`col-${day}`);
    if (!col) continue;
    col.appendChild(buildCard(row));
  }
}

async function insertRow(payload) {
  const { error } = await window.db
    .from("plantafel")
    .insert([payload]);

  if (error) {
    console.error(error);
    alert("Fehler beim Speichern ❌");
    return false;
  }
  return true;
}

async function updateWeekday(id, newDay) {
  const { error } = await window.db
    .from("plantafel")
    .update({ weekday: newDay })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Fehler beim Verschieben ❌");
    return false;
  }
  return true;
}

function wireDropZones() {
  for (const day of DAYS) {
    const zone = document.getElementById(`col-${day}`);
    if (!zone) continue;

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drop-hover");
      e.dataTransfer.dropEffect = "move";
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drop-hover");
    });

    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("drop-hover");

      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;

      const ok = await updateWeekday(id, day);
      if (ok) await loadData();
    });
  }
}

// Events
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!window.db) {
    alert("Supabase ist nicht verbunden. Bitte supabase.js prüfen.");
    return;
  }

  const payload = {
    kw: Number(kwEl.value),
    weekday: weekdayEl.value,
    titel: titelEl.value.trim(),
    baustelle: baustelleEl.value.trim(),
    mitarbeiter: mitarbeiterEl.value.trim(),
    fahrzeug: fahrzeugEl.value.trim(),
    status: statusEl.value,
    notiz: notizEl.value.trim(),
  };

  if (!payload.kw || payload.kw < 1 || payload.kw > 53) {
    alert("Bitte KW korrekt eingeben.");
    return;
  }
  if (!DAYS.includes(payload.weekday)) {
    alert("Bitte Wochentag wählen.");
    return;
  }
  if (!payload.titel) {
    alert("Bitte Titel eingeben.");
    return;
  }

  const ok = await insertRow(payload);
  if (ok) {
    alert("Gespeichert ✅");
    form.reset();
    kwEl.value = payload.kw; // KW behalten
    statusEl.value = "normal";
    await loadData();
  }
});

reloadBtn.addEventListener("click", loadData);
clearBtn.addEventListener("click", () => {
  const kw = kwEl.value;
  form.reset();
  kwEl.value = kw;
  statusEl.value = "normal";
});

// Start
(function init() {
  kwEl.value = isoWeekNumber(new Date());
  wireDropZones();
  loadData();
})();
