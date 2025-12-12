// ================================
// Plantafel – Version 1 (UMD, ohne module/import)
// Tabellen: mitarbeiter, fahrzeuge, projekte, einsatzplan
// einsatzplan: { id, kw, weekday, projekt_id, typ, item_id }
// typ: "mitarbeiter" | "fahrzeug"
// ================================

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const elStatus = document.getElementById("statusText");
const elDbHint = document.getElementById("dbHint");

const elKwStart = document.getElementById("kwStartInput");
const elPrev = document.getElementById("btnPrevKw");
const elNext = document.getElementById("btnNextKw");
const elThisWeek = document.getElementById("btnThisWeek");
const elReload = document.getElementById("btnReload");

const elPoolMA = document.getElementById("poolMitarbeiter");
const elPoolFZ = document.getElementById("poolFahrzeuge");
const elTrash = document.getElementById("trashZone");

const elProjectForm = document.getElementById("projectForm");
const elProjectName = document.getElementById("projectName");
const elProjectList = document.getElementById("projectList");

const elBoard = document.getElementById("board");

// State
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr"];
let projekts = [];
let mitarbeiter = [];
let fahrzeuge = [];
let einsaetze = []; // visible weeks
let dragging = null; // payload

// ---------- Helpers ----------
function setStatus(msg) {
  elStatus.textContent = msg || "";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ISO week number
function isoWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function wrapKW(kw) {
  if (kw < 1) return 53;
  if (kw > 53) return 1;
  return kw;
}

function visibleKWs() {
  const start = Number(elKwStart.value || isoWeekNumber());
  return [start, wrapKW(start + 1), wrapKW(start + 2), wrapKW(start + 3)];
}

// ---------- Drag payload ----------
function setDragPayload(payload) {
  dragging = payload;
}

function getDragPayload() {
  return dragging;
}

// ---------- Load ----------
async function loadAll() {
  const kws = visibleKWs();
  setStatus("Lade Daten…");

  const [pRes, mRes, fRes, eRes] = await Promise.all([
    db.from("projekte").select("id,name").order("name", { ascending: true }),
    db.from("mitarbeiter").select("id,name,color").order("name", { ascending: true }),
    db.from("fahrzeuge").select("id,name,kennzeichen,color").order("name", { ascending: true }),
    db.from("einsatzplan").select("*").in("kw", kws),
  ]);

  if (pRes.error) return showDbError("projekte", pRes.error);
  if (mRes.error) return showDbError("mitarbeiter", mRes.error);
  if (fRes.error) return showDbError("fahrzeuge", fRes.error);
  if (eRes.error) return showDbError("einsatzplan", eRes.error);

  projekts = pRes.data || [];
  mitarbeiter = mRes.data || [];
  fahrzeuge = fRes.data || [];
  einsaetze = eRes.data || [];

  elDbHint.textContent = `OK · Projekte: ${projekts.length} · MA: ${mitarbeiter.length} · FZ: ${fahrzeuge.length}`;
  setStatus("Bereit.");

  renderPools();
  renderProjectList();
  renderBoard();
}

function showDbError(table, err) {
  console.error(err);
  elDbHint.textContent = "Fehler";
  setStatus("Fehler.");
  alert(`Supabase-Fehler bei Tabelle "${table}":\n\n${err.message}\n\n(Details in der Konsole)`);
}

// ---------- Render Pools ----------
function makePoolMagnet(kind, row) {
  const el = document.createElement("div");
  el.className = "magnet";
  el.draggable = true;
  el.dataset.kind = kind;
  el.dataset.itemId = row.id;

  const label = kind === "fahrzeug"
    ? `${row.name}${row.kennzeichen ? " (" + row.kennzeichen + ")" : ""}`
    : row.name;

  el.innerHTML = `
    <span>${escapeHtml(label)}</span>
    <span class="pill">${kind === "mitarbeiter" ? "MA" : "FZ"}</span>
  `;

  el.addEventListener("dragstart", () => {
    setDragPayload({
      origin: "pool",
      kind,
      itemId: row.id
    });
  });

  return el;
}

function renderPools() {
  elPoolMA.innerHTML = "";
  elPoolFZ.innerHTML = "";

  mitarbeiter.forEach(m => elPoolMA.appendChild(makePoolMagnet("mitarbeiter", m)));
  fahrzeuge.forEach(f => elPoolFZ.appendChild(makePoolMagnet("fahrzeug", f)));

  wireTrash();
}

function wireTrash() {
  elTrash.addEventListener("dragover", (e) => {
    e.preventDefault();
    elTrash.classList.add("dragover");
  });
  elTrash.addEventListener("dragleave", () => elTrash.classList.remove("dragover"));

  elTrash.addEventListener("drop", async (e) => {
    e.preventDefault();
    elTrash.classList.remove("dragover");

    const payload = getDragPayload();
    if (!payload) return;

    // only assigned magnets can be deleted
    if (payload.origin === "assign" && payload.einsatzId) {
      await deleteEinsatz(payload.einsatzId);
      await loadAll();
    }
  });
}

// ---------- Projects ----------
function renderProjectList() {
  elProjectList.innerHTML = "";

  projekts.forEach(p => {
    const row = document.createElement("div");
    row.className = "projectItem";
    row.innerHTML = `
      <div class="projectItem__name">${escapeHtml(p.name)}</div>
      <div class="projectItem__btns">
        <button class="btn btn--secondary" type="button" data-del="${p.id}">Löschen</button>
      </div>
    `;
    row.querySelector("[data-del]").addEventListener("click", async () => {
      if (!confirm(`Projekt "${p.name}" löschen?`)) return;
      const { error } = await db.from("projekte").delete().eq("id", p.id);
      if (error) {
        console.error(error);
        alert("Fehler beim Löschen: " + error.message);
      } else {
        await loadAll();
      }
    });
    elProjectList.appendChild(row);
  });
}

elProjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = elProjectName.value.trim();
  if (!name) return;

  setStatus("Projekt anlegen…");
  const { error } = await db.from("projekte").insert([{ name }]);
  if (error) {
    console.error(error);
    alert("Fehler beim Projekt anlegen: " + error.message);
  }
  elProjectName.value = "";
  await loadAll();
});

// ---------- Board ----------
function renderBoard() {
  const kws = visibleKWs();
  elBoard.innerHTML = "";

  kws.forEach(kw => {
    const week = document.createElement("section");
    week.className = "week";
    week.dataset.kw = String(kw);

    week.innerHTML = `
      <div class="week__top">
        <div class="week__title">KW ${kw}</div>
        <div class="week__sub">Mo–Fr</div>
      </div>
      <div class="days" id="week-${kw}"></div>
    `;

    const daysWrap = week.querySelector(`#week-${kw}`);

    DAYS.forEach(day => {
      const dayRow = document.createElement("div");
      dayRow.className = "dayRow";
      dayRow.innerHTML = `
        <div class="dayRow__head">
          <div class="dayRow__day">${day}</div>
          <div class="small">Projekt oben · Magnete unten</div>
        </div>
        <div class="dayRow__body" id="kw${kw}-${day}"></div>
      `;

      const body = dayRow.querySelector(`#kw${kw}-${day}`);

      // For each project: fixed block
      projekts.forEach(p => {
        const block = document.createElement("div");
        block.className = "projectBlock";
        block.innerHTML = `
          <div class="projectBlock__top">${escapeHtml(p.name)}</div>
          <div class="projectBlock__zones">
            <div>
              <div class="zoneTitle">Mitarbeiter</div>
              <div class="dropzone"
                   data-kw="${kw}"
                   data-day="${day}"
                   data-project="${p.id}"
                   data-kind="mitarbeiter"></div>
            </div>
            <div>
              <div class="zoneTitle">Fahrzeuge</div>
              <div class="dropzone"
                   data-kw="${kw}"
                   data-day="${day}"
                   data-project="${p.id}"
                   data-kind="fahrzeug"></div>
            </div>
          </div>
        `;
        body.appendChild(block);
      });

      daysWrap.appendChild(dayRow);
    });

    elBoard.appendChild(week);
  });

  wireDropzones();
  placeAssignments();
}

function wireDropzones() {
  const zones = elBoard.querySelectorAll(".dropzone");
  zones.forEach(zone => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));

    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");

      const payload = getDragPayload();
      if (!payload) return;

      const kw = Number(zone.dataset.kw);
      const day = zone.dataset.day;
      const projectId = zone.dataset.project;
      const kind = zone.dataset.kind;

      if (payload.kind !== kind) return;

      // pool -> insert
      if (payload.origin === "pool") {
        await insertEinsatz({ kw, day, projectId, kind, itemId: payload.itemId });
        await loadAll();
        return;
      }

      // assigned -> move
      if (payload.origin === "assign" && payload.einsatzId) {
        await moveEinsatz({ einsatzId: payload.einsatzId, kw, day, projectId });
        await loadAll();
      }
    });
  });
}

function placeAssignments() {
  // clear zones
  elBoard.querySelectorAll(".dropzone").forEach(z => (z.innerHTML = ""));

  for (const e of einsaetze) {
    const zone = elBoard.querySelector(
      `.dropzone[data-kw="${e.kw}"][data-day="${CSS.escape(e.weekday)}"][data-project="${e.projekt_id}"][data-kind="${e.typ}"]`
    );
    if (!zone) continue;

    const name = resolveName(e.typ, e.item_id);
    zone.appendChild(makeAssignedMagnet(e, name));
  }
}

function resolveName(kind, id) {
  if (kind === "mitarbeiter") {
    return mitarbeiter.find(x => x.id === id)?.name || "MA?";
  }
  const f = fahrzeuge.find(x => x.id === id);
  if (!f) return "FZ?";
  return `${f.name}${f.kennzeichen ? " (" + f.kennzeichen + ")" : ""}`;
}

function makeAssignedMagnet(einsatz, label) {
  const el = document.createElement("div");
  el.className = "magnet";
  el.draggable = true;

  el.innerHTML = `
    <span>${escapeHtml(label)}</span>
    <span class="pill">${einsatz.typ === "mitarbeiter" ? "MA" : "FZ"}</span>
  `;

  el.addEventListener("dragstart", () => {
    setDragPayload({
      origin: "assign",
      einsatzId: einsatz.id,
      kind: einsatz.typ,
      itemId: einsatz.item_id
    });
  });

  return el;
}

// ---------- DB ops ----------
async function insertEinsatz({ kw, day, projectId, kind, itemId }) {
  // prevent duplicates in same cell
  const exists = einsaetze.some(x =>
    Number(x.kw) === kw &&
    x.weekday === day &&
    x.projekt_id === projectId &&
    x.typ === kind &&
    x.item_id === itemId
  );
  if (exists) return;

  setStatus("Zuweisen…");
  const { error } = await db.from("einsatzplan").insert([{
    kw,
    weekday: day,
    projekt_id: projectId,
    typ: kind,       // <- KRITISCH (damit NOT NULL passt)
    item_id: itemId
  }]);

  if (error) {
    console.error(error);
    alert("Fehler beim Zuweisen: " + error.message);
  }
}

async function moveEinsatz({ einsatzId, kw, day, projectId }) {
  setStatus("Verschieben…");
  const { error } = await db.from("einsatzplan")
    .update({ kw, weekday: day, projekt_id: projectId })
    .eq("id", einsatzId);

  if (error) {
    console.error(error);
    alert("Fehler beim Verschieben: " + error.message);
  }
}

async function deleteEinsatz(einsatzId) {
  setStatus("Löschen…");
  const { error } = await db.from("einsatzplan").delete().eq("id", einsatzId);

  if (error) {
    console.error(error);
    alert("Fehler beim Löschen: " + error.message);
  }
}

// ---------- KW Controls ----------
function setKwToThisWeek() {
  elKwStart.value = String(isoWeekNumber());
}

elReload.addEventListener("click", loadAll);

elThisWeek.addEventListener("click", async () => {
  setKwToThisWeek();
  await loadAll();
});

elPrev.addEventListener("click", async () => {
  elKwStart.value = String(wrapKW(Number(elKwStart.value) - 1));
  await loadAll();
});

elNext.addEventListener("click", async () => {
  elKwStart.value = String(wrapKW(Number(elKwStart.value) + 1));
  await loadAll();
});

elKwStart.addEventListener("change", loadAll);

// ---------- Start ----------
(function init() {
  try {
    setStatus("Verbinden…");
    setKwToThisWeek();
    loadAll();
  } catch (e) {
    console.error(e);
    alert("Startfehler: " + e.message);
  }
})();
