// Digitale Plantafel wie Foto:
// 4 Wochen nebeneinander
// Pro Tag: Projekte als feste Blöcke (Projekt steht oben)
// Magnete: Mitarbeiter & Fahrzeuge aus Stammdaten
// Drag & Drop: Zuweisen/verschieben/entfernen

const db = window.db;

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr"];

const elBoard = document.getElementById("board");
const elKwStart = document.getElementById("kwStart");
const elKwPrev = document.getElementById("kwPrev");
const elKwNext = document.getElementById("kwNext");
const elReload = document.getElementById("reloadBtn");
const elDbStatus = document.getElementById("dbStatus");

const elPoolMA = document.getElementById("poolMitarbeiter");
const elPoolFZ = document.getElementById("poolFahrzeuge");
const elTrash = document.getElementById("trashZone");

const elProjectForm = document.getElementById("projectForm");
const elProjectName = document.getElementById("projectName");
const elProjectList = document.getElementById("projectList");

// ------------ Helpers ------------
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
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function setStatus(msg) {
  elDbStatus.textContent = msg || "";
}

// ------------ Supabase schema assumptions ------------
/*
Tables:

mitarbeiter: id (uuid), name (text)
fahrzeuge:   id (uuid), name (text)
projekte:    id (uuid), name (text)

einsatzplan:
  id (uuid)
  kw (int4)
  weekday (text)     // "Mo".."Fr"
  projekt_id (uuid)
  typ (text)         // "mitarbeiter" | "fahrzeug"
  item_id (uuid)     // references mitarbeiter.id or fahrzeuge.id
*/

// ------------ State ------------
let projekts = [];
let mitarbeiter = [];
let fahrzeuge = [];
let einsaetze = []; // rows from einsatzplan for visible weeks

// ------------ Loaders ------------
async function loadAll() {
  if (!db) {
    setStatus("Supabase: nicht verbunden");
    alert("Supabase (window.db) fehlt. Prüfe supabase.js");
    return;
  }

  const kws = visibleKWs();

  setStatus("Lade Daten …");

  // Load in parallel
  const [pRes, mRes, fRes, eRes] = await Promise.all([
    db.from("projekte").select("id,name").order("name", { ascending: true }),
    db.from("mitarbeiter").select("id,name").order("name", { ascending: true }),
    db.from("fahrzeuge").select("id,name").order("name", { ascending: true }),
    db.from("einsatzplan").select("*").in("kw", kws)
  ]);

  // Error handling with clear messages
  if (pRes.error) return schemaError("projekte", pRes.error);
  if (mRes.error) return schemaError("mitarbeiter", mRes.error);
  if (fRes.error) return schemaError("fahrzeuge", fRes.error);
  if (eRes.error) return schemaError("einsatzplan", eRes.error);

  projekts = pRes.data || [];
  mitarbeiter = mRes.data || [];
  fahrzeuge = fRes.data || [];
  einsaetze = eRes.data || [];

  setStatus("OK");

  renderPools();
  renderProjectList();
  renderBoard();
}

function schemaError(table, err) {
  console.error(err);
  setStatus("Fehler");
  alert(
    `Supabase-Fehler bei Tabelle "${table}".\n\n` +
    `Wahrscheinlich fehlt die Tabelle oder Spalten passen nicht.\n` +
    `Öffne Supabase -> Table Editor und prüfe "${table}".\n\n` +
    `Details (Console): ${err.message}`
  );
}

// ------------ Render: Pools ------------
function makePoolMagnet(kind, row) {
  const el = document.createElement("div");
  el.className = "magnet";
  el.draggable = true;
  el.dataset.kind = kind;      // "mitarbeiter" | "fahrzeug"
  el.dataset.itemId = row.id;  // uuid
  el.dataset.from = "pool";    // pool origin

  el.innerHTML = `
    <span>${escapeHtml(row.name)}</span>
    <span class="pill">${kind === "mitarbeiter" ? "MA" : "FZ"}</span>
  `;

  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      origin: "pool",
      kind,
      itemId: row.id
    }));
    e.dataTransfer.effectAllowed = "copy";
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

    const payload = safeParseDrag(e.dataTransfer.getData("text/plain"));
    if (!payload) return;

    // only delete if it was an assigned magnet (origin assignment)
    if (payload.origin === "assign" && payload.einsatzId) {
      await deleteEinsatz(payload.einsatzId);
      await loadAll();
    }
  });
}

function safeParseDrag(str) {
  try { return JSON.parse(str); } catch { return null; }
}

// ------------ Render: Projects sidebar ------------
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
      if (!confirm(`Projekt "${p.name}" löschen? (Einsatzplan-Einträge bleiben bestehen!)`)) return;
      const { error } = await db.from("projekte").delete().eq("id", p.id);
      if (error) {
        console.error(error);
        alert("Fehler beim Löschen ❌");
      } else {
        await loadAll();
      }
    });
    elProjectList.appendChild(row);
  });
}

// Add project
elProjectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = elProjectName.value.trim();
  if (!name) return;

  const { error } = await db.from("projekte").insert([{ name }]);
  if (error) {
    console.error(error);
    alert("Fehler beim Projekt anlegen ❌");
    return;
  }
  elProjectName.value = "";
  await loadAll();
});

// ------------ Render: Board skeleton + zones ------------
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

      // For each project: fixed block (like your board)
      projekts.forEach(p => {
        const block = document.createElement("div");
        block.className = "projectBlock";
        block.dataset.kw = String(kw);
        block.dataset.day = day;
        block.dataset.projectId = p.id;

        block.innerHTML = `
          <div class="projectBlock__top">${escapeHtml(p.name)}</div>
          <div class="projectBlock__zones">
            <div>
              <div class="zoneTitle">Mitarbeiter</div>
              <div class="dropzone"
                   data-kw="${kw}"
                   data-day="${day}"
                   data-project-id="${p.id}"
                   data-kind="mitarbeiter"></div>
            </div>
            <div>
              <div class="zoneTitle">Fahrzeuge</div>
              <div class="dropzone"
                   data-kw="${kw}"
                   data-day="${day}"
                   data-project-id="${p.id}"
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

// ------------ Place existing assignments into zones ------------
function placeAssignments() {
  // clear all zones
  elBoard.querySelectorAll(".dropzone").forEach(z => (z.innerHTML = ""));

  for (const e of einsaetze) {
    const kw = Number(e.kw);
    const day = e.weekday;
    const pid = e.projekt_id;
    const kind = e.typ; // "mitarbeiter" | "fahrzeug"
    const itemId = e.item_id;

    const zone = elBoard.querySelector(
      `.dropzone[data-kw="${kw}"][data-day="${CSS.escape(day)}"][data-project-id="${pid}"][data-kind="${kind}"]`
    );
    if (!zone) continue;

    const name = (kind === "mitarbeiter"
      ? (mitarbeiter.find(x => x.id === itemId)?.name || "MA?")
      : (fahrzeuge.find(x => x.id === itemId)?.name || "FZ?")
    );

    zone.appendChild(makeAssignedMagnet(e.id, kind, itemId, name));
  }
}

// assigned magnets (can be moved/deleted)
function makeAssignedMagnet(einsatzId, kind, itemId, name) {
  const el = document.createElement("div");
  el.className = "magnet";
  el.draggable = true;

  el.dataset.kind = kind;
  el.dataset.itemId = itemId;
  el.dataset.einsatzId = einsatzId;

  el.innerHTML = `
    <span>${escapeHtml(name)}</span>
    <span class="pill">${kind === "mitarbeiter" ? "MA" : "FZ"}</span>
  `;

  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      origin: "assign",
      einsatzId,
      kind,
      itemId
    }));
    e.dataTransfer.effectAllowed = "move";
  });

  return el;
}

// ------------ Dropzones: assign / move ------------
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

      const payload = safeParseDrag(e.dataTransfer.getData("text/plain"));
      if (!payload) return;

      const kw = Number(zone.dataset.kw);
      const day = zone.dataset.day;
      const projectId = zone.dataset.projectId;
      const kind = zone.dataset.kind;

      // only allow same kind into zone
      if (payload.kind !== kind) return;

      // from pool -> insert new assignment
      if (payload.origin === "pool") {
        await insertEinsatz({ kw, day, projectId, kind, itemId: payload.itemId });
        await loadAll();
        return;
      }

      // from assigned -> move/update existing assignment
      if (payload.origin === "assign" && payload.einsatzId) {
        await moveEinsatz({ einsatzId: payload.einsatzId, kw, day, projectId });
        await loadAll();
      }
    });
  });
}

async function insertEinsatz({ kw, day, projectId, kind, itemId }) {
  // optional: prevent duplicates (same item already in same slot)
  const exists = einsaetze.some(e =>
    Number(e.kw) === kw &&
    e.weekday === day &&
    e.projekt_id === projectId &&
    e.typ === kind &&
    e.item_id === itemId
  );
  if (exists) return;

  const { error } = await db.from("einsatzplan").insert([{
    kw,
    weekday: day,
    projekt_id: projectId,
    typ: kind,
    item_id: itemId
  }]);
  if (error) {
    console.error(error);
    alert("Fehler beim Zuweisen ❌");
  }
}

async function moveEinsatz({ einsatzId, kw, day, projectId }) {
  const { error } = await db.from("einsatzplan")
    .update({ kw, weekday: day, projekt_id: projectId })
    .eq("id", einsatzId);

  if (error) {
    console.error(error);
    alert("Fehler beim Verschieben ❌");
  }
}

async function deleteEinsatz(einsatzId) {
  const { error } = await db.from("einsatzplan").delete().eq("id", einsatzId);
  if (error) {
    console.error(error);
    alert("Fehler beim Löschen ❌");
  }
}

// ------------ KW Controls ------------
elReload.addEventListener("click", loadAll);
elKwPrev.addEventListener("click", async () => {
  elKwStart.value = String(wrapKW(Number(elKwStart.value) - 1));
  await loadAll();
});
elKwNext.addEventListener("click", async () => {
  elKwStart.value = String(wrapKW(Number(elKwStart.value) + 1));
  await loadAll();
});

// ------------ Start ------------
(function init() {
  elKwStart.value = String(isoWeekNumber());
  loadAll();
})();
