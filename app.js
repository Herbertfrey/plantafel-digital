/* global supabase */
/**
 * Plantafel – komplett neu
 * Tabellen (public):
 * - mitarbeiter: id uuid PK default gen_random_uuid(), name text, color text
 * - fahrzeuge:  id uuid PK default gen_random_uuid(), name text, color text, kennzeichen text
 * - projekte:   id uuid PK default gen_random_uuid(), name text
 * - einsatzplan:id uuid PK default gen_random_uuid(), kw int4, weekday text, projekt_id uuid, typ text, item_id uuid
 *
 * typ: "mitarbeiter" | "fahrzeug"
 */

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U"; // <-- hier einsetzen

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAYS = [
  { key: "Mo", label: "Mo" },
  { key: "Di", label: "Di" },
  { key: "Mi", label: "Mi" },
  { key: "Do", label: "Do" },
  { key: "Fr", label: "Fr" },
];

const els = {
  startKw: document.getElementById("startKw"),
  btnReload: document.getElementById("btnReload"),

  empName: document.getElementById("empName"),
  btnAddEmp: document.getElementById("btnAddEmp"),
  empList: document.getElementById("empList"),

  vehName: document.getElementById("vehName"),
  vehPlate: document.getElementById("vehPlate"),
  btnAddVeh: document.getElementById("btnAddVeh"),
  vehList: document.getElementById("vehList"),

  projName: document.getElementById("projName"),
  btnAddProj: document.getElementById("btnAddProj"),
  projList: document.getElementById("projList"),

  board: document.getElementById("board"),
  trash: document.getElementById("trash"),
};

let state = {
  mitarbeiter: [],
  fahrzeuge: [],
  projekte: [],
  einsatz: [], // rows from einsatzplan
};

function randColorFromName(name) {
  const s = (name || "").trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // h -> HSL-ish hex-ish quick palette
  const r = 80 + (h % 140);
  const g = 80 + ((h >> 8) % 140);
  const b = 80 + ((h >> 16) % 140);
  return `rgb(${r},${g},${b})`;
}

function toast(msg) {
  alert(msg);
}

function mustKeyInserted() {
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("HIER_DEIN_ANON_KEY")) {
    toast("Bitte zuerst den Anon-Key in app.js eintragen (SUPABASE_ANON_KEY).");
    return false;
  }
  return true;
}

/* -------------------- DB Helpers -------------------- */

async function loadAll() {
  if (!mustKeyInserted()) return;

  const [emp, veh, proj] = await Promise.all([
    db.from("mitarbeiter").select("*").order("name", { ascending: true }),
    db.from("fahrzeuge").select("*").order("name", { ascending: true }),
    db.from("projekte").select("*").order("name", { ascending: true }),
  ]);

  if (emp.error) return toast("Fehler mitarbeiter: " + emp.error.message);
  if (veh.error) return toast("Fehler fahrzeuge: " + veh.error.message);
  if (proj.error) return toast("Fehler projekte: " + proj.error.message);

  state.mitarbeiter = emp.data || [];
  state.fahrzeuge = veh.data || [];
  state.projekte = proj.data || [];

  await loadEinsatzplanForView();

  renderAll();
}

async function loadEinsatzplanForView() {
  const startKw = clampKw(parseInt(els.startKw.value || "1", 10));
  const kws = [startKw, startKw + 1, startKw + 2, startKw + 3].map(normalizeKw);

  const res = await db
    .from("einsatzplan")
    .select("*")
    .in("kw", kws);

  if (res.error) return toast("Fehler einsatzplan: " + res.error.message);
  state.einsatz = res.data || [];
}

function clampKw(n) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(53, Math.max(1, n));
}
function normalizeKw(n) {
  // simple wrap 53 -> 1
  let x = n;
  while (x > 53) x -= 53;
  while (x < 1) x += 53;
  return x;
}

/* -------------------- CRUD -------------------- */

async function addMitarbeiter(name) {
  name = (name || "").trim();
  if (!name) return;

  const payload = {
    name,
    color: randColorFromName(name),
  };

  const res = await db.from("mitarbeiter").insert(payload).select("*").single();
  if (res.error) return toast("Mitarbeiter anlegen fehlgeschlagen: " + res.error.message);

  state.mitarbeiter.push(res.data);
  state.mitarbeiter.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  renderAll();
}

async function deleteMitarbeiter(id) {
  // Zuweisungen mitlöschen
  await db.from("einsatzplan").delete().eq("typ", "mitarbeiter").eq("item_id", id);
  const res = await db.from("mitarbeiter").delete().eq("id", id);
  if (res.error) return toast("Mitarbeiter löschen fehlgeschlagen: " + res.error.message);

  state.mitarbeiter = state.mitarbeiter.filter(x => x.id !== id);
  state.einsatz = state.einsatz.filter(x => !(x.typ === "mitarbeiter" && x.item_id === id));
  renderAll();
}

async function addFahrzeug(name, kennzeichen) {
  name = (name || "").trim();
  kennzeichen = (kennzeichen || "").trim();
  if (!name) return;

  const payload = {
    name,
    kennzeichen: kennzeichen || null,
    color: randColorFromName(name),
  };

  const res = await db.from("fahrzeuge").insert(payload).select("*").single();
  if (res.error) return toast("Fahrzeug anlegen fehlgeschlagen: " + res.error.message);

  state.fahrzeuge.push(res.data);
  state.fahrzeuge.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  renderAll();
}

async function deleteFahrzeug(id) {
  await db.from("einsatzplan").delete().eq("typ", "fahrzeug").eq("item_id", id);
  const res = await db.from("fahrzeuge").delete().eq("id", id);
  if (res.error) return toast("Fahrzeug löschen fehlgeschlagen: " + res.error.message);

  state.fahrzeuge = state.fahrzeuge.filter(x => x.id !== id);
  state.einsatz = state.einsatz.filter(x => !(x.typ === "fahrzeug" && x.item_id === id));
  renderAll();
}

async function addProjekt(name) {
  name = (name || "").trim();
  if (!name) return;

  const res = await db.from("projekte").insert({ name }).select("*").single();
  if (res.error) return toast("Projekt anlegen fehlgeschlagen: " + res.error.message);

  state.projekte.push(res.data);
  state.projekte.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  renderAll();
}

async function deleteProjekt(id) {
  // Zuweisungen für Projekt löschen
  await db.from("einsatzplan").delete().eq("projekt_id", id);

  const res = await db.from("projekte").delete().eq("id", id);
  if (res.error) return toast("Projekt löschen fehlgeschlagen: " + res.error.message);

  state.projekte = state.projekte.filter(x => x.id !== id);
  state.einsatz = state.einsatz.filter(x => x.projekt_id !== id);
  renderAll();
}

/* -------------------- Einsatzplan (Zuweisung) -------------------- */

function findEinsatz(kw, weekday, projekt_id, typ, item_id) {
  return state.einsatz.find(r =>
    r.kw === kw &&
    r.weekday === weekday &&
    r.projekt_id === projekt_id &&
    r.typ === typ &&
    r.item_id === item_id
  );
}

async function createAssignment({ kw, weekday, projekt_id, typ, item_id }) {
  // Duplikate verhindern
  if (findEinsatz(kw, weekday, projekt_id, typ, item_id)) return;

  const res = await db.from("einsatzplan").insert({
    kw, weekday, projekt_id, typ, item_id
  }).select("*").single();

  if (res.error) return toast("Zuweisung fehlgeschlagen: " + res.error.message);

  state.einsatz.push(res.data);
  renderBoardOnly();
}

async function deleteAssignment(assignmentId) {
  const res = await db.from("einsatzplan").delete().eq("id", assignmentId);
  if (res.error) return toast("Zuweisung löschen fehlgeschlagen: " + res.error.message);

  state.einsatz = state.einsatz.filter(x => x.id !== assignmentId);
  renderBoardOnly();
}

async function moveAssignment(assignmentId, { kw, weekday, projekt_id }) {
  const res = await db.from("einsatzplan")
    .update({ kw, weekday, projekt_id })
    .eq("id", assignmentId)
    .select("*")
    .single();

  if (res.error) return toast("Verschieben fehlgeschlagen: " + res.error.message);

  state.einsatz = state.einsatz.map(x => (x.id === assignmentId ? res.data : x));
  renderBoardOnly();
}

/* -------------------- Drag & Drop -------------------- */

function setDragData(ev, data) {
  ev.dataTransfer.setData("application/json", JSON.stringify(data));
  ev.dataTransfer.effectAllowed = "move";
}

function getDragData(ev) {
  const raw = ev.dataTransfer.getData("application/json");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/* -------------------- Render -------------------- */

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function renderAll() {
  renderMagnetLists();
  renderProjects();
  renderBoard();
}

function renderMagnetLists() {
  clear(els.empList);
  clear(els.vehList);

  for (const m of state.mitarbeiter) {
    els.empList.appendChild(makeMagnet({
      id: m.id,
      label: m.name,
      color: m.color,
      typ: "mitarbeiter",
      meta: null,
      onDelete: () => deleteMitarbeiter(m.id),
    }));
  }

  for (const v of state.fahrzeuge) {
    const meta = v.kennzeichen ? v.kennzeichen : null;
    els.vehList.appendChild(makeMagnet({
      id: v.id,
      label: v.name,
      color: v.color,
      typ: "fahrzeug",
      meta,
      onDelete: () => deleteFahrzeug(v.id),
    }));
  }
}

function makeMagnet({ id, label, color, typ, meta, onDelete }) {
  const el = document.createElement("div");
  el.className = "magnet";
  el.draggable = true;

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = color || "#94a3b8";

  const text = document.createElement("span");
  text.textContent = label || "-";

  el.appendChild(dot);
  el.appendChild(text);

  if (meta) {
    const m = document.createElement("span");
    m.className = "meta";
    m.textContent = meta;
    el.appendChild(m);
  }

  const del = document.createElement("button");
  del.className = "del";
  del.type = "button";
  del.title = "Löschen";
  del.textContent = "🗑";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    onDelete();
  });
  el.appendChild(del);

  el.addEventListener("dragstart", (ev) => {
    setDragData(ev, { kind: "magnet", typ, item_id: id });
  });

  return el;
}

function renderProjects() {
  clear(els.projList);

  if (state.projekte.length === 0) {
    const p = document.createElement("div");
    p.className = "small";
    p.textContent = "Noch keine Projekte. Oben eins anlegen.";
    els.projList.appendChild(p);
    return;
  }

  for (const p of state.projekte) {
    const row = document.createElement("div");
    row.className = "project-row";

    const left = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = p.name || "-";
    left.appendChild(strong);

    const right = document.createElement("div");
    right.className = "right";

    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = "steht oben (wie an der Tafel)";

    const btnDel = document.createElement("button");
    btnDel.className = "btn";
    btnDel.type = "button";
    btnDel.textContent = "Löschen";
    btnDel.addEventListener("click", () => {
      if (confirm(`Projekt wirklich löschen?\n\n${p.name}\n\n(Alle Zuweisungen dazu werden entfernt)`)) {
        deleteProjekt(p.id);
      }
    });

    right.appendChild(b);
    right.appendChild(btnDel);

    row.appendChild(left);
    row.appendChild(right);

    els.projList.appendChild(row);
  }
}

function renderBoard() {
  clear(els.board);

  const startKw = clampKw(parseInt(els.startKw.value || "1", 10));
  const weeks = [0, 1, 2, 3].map(i => normalizeKw(startKw + i));

  for (const kw of weeks) {
    const weekEl = document.createElement("div");
    weekEl.className = "week";

    const head = document.createElement("div");
    head.className = "week-head";
    head.innerHTML = `<div class="kw">KW ${kw}</div><div class="small">Mo–Fr</div>`;
    weekEl.appendChild(head);

    const daysEl = document.createElement("div");
    daysEl.className = "week-days";

    for (const d of DAYS) {
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      const h3 = document.createElement("h3");
      h3.textContent = d.label;
      dayEl.appendChild(h3);

      const content = document.createElement("div");
      content.className = "day-content";

      // pro Tag alle Projekte als Karten
      for (const proj of state.projekte) {
        const card = makeProjectDayCard({ kw, weekday: d.key, proj });
        content.appendChild(card);
      }

      dayEl.appendChild(content);
      daysEl.appendChild(dayEl);
    }

    weekEl.appendChild(daysEl);
    els.board.appendChild(weekEl);
  }
}

function renderBoardOnly() {
  // nur Board neu zeichnen (schneller)
  renderBoard();
}

function makeProjectDayCard({ kw, weekday, proj }) {
  const card = document.createElement("div");
  card.className = "projcard";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = proj.name || "-";
  card.appendChild(title);

  const zones = document.createElement("div");
  zones.className = "dropzones";

  zones.appendChild(makeDropZone({
    label: "Mitarbeiter",
    kw, weekday,
    projekt_id: proj.id,
    typ: "mitarbeiter",
  }));

  zones.appendChild(makeDropZone({
    label: "Fahrzeuge",
    kw, weekday,
    projekt_id: proj.id,
    typ: "fahrzeug",
  }));

  card.appendChild(zones);
  return card;
}

function makeDropZone({ label, kw, weekday, projekt_id, typ }) {
  const zone = document.createElement("div");
  zone.className = "dropzone";

  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label;
  zone.appendChild(l);

  const chips = document.createElement("div");
  chips.className = "chips";
  zone.appendChild(chips);

  // vorhandene Zuweisungen für diese Zone
  const items = state.einsatz.filter(r =>
    r.kw === kw &&
    r.weekday === weekday &&
    r.projekt_id === projekt_id &&
    r.typ === typ
  );

  for (const row of items) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.draggable = true;

    const display = getDisplayForRow(row);
    chip.textContent = display;
    chip.style.borderColor = "rgba(148,163,184,.6)";

    // Drag = Assignment verschieben
    chip.addEventListener("dragstart", (ev) => {
      setDragData(ev, { kind: "assignment", assignment_id: row.id });
    });

    const x = document.createElement("button");
    x.className = "x";
    x.type = "button";
    x.textContent = "✕";
    x.title = "Zuweisung entfernen";
    x.addEventListener("click", () => deleteAssignment(row.id));
    chip.appendChild(x);

    chips.appendChild(chip);
  }

  // Drop Handling
  zone.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    zone.classList.add("over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", async (ev) => {
    ev.preventDefault();
    zone.classList.remove("over");

    const data = getDragData(ev);
    if (!data) return;

    if (data.kind === "magnet") {
      if (data.typ !== typ) return; // falsche Zone
      await createAssignment({
        kw, weekday, projekt_id, typ, item_id: data.item_id
      });
      return;
    }

    if (data.kind === "assignment") {
      // assignment in anderes Projekt/Tag verschieben (typ bleibt gleich)
      const row = state.einsatz.find(x => x.id === data.assignment_id);
      if (!row) return;
      if (row.typ !== typ) return; // nur in gleiche Zone (Mitarbeiter bleibt Mitarbeiter)
      await moveAssignment(data.assignment_id, { kw, weekday, projekt_id });
    }
  });

  return zone;
}

function getDisplayForRow(row) {
  if (row.typ === "mitarbeiter") {
    const m = state.mitarbeiter.find(x => x.id === row.item_id);
    return m ? m.name : "(Mitarbeiter)";
  }
  if (row.typ === "fahrzeug") {
    const f = state.fahrzeuge.find(x => x.id === row.item_id);
    if (!f) return "(Fahrzeug)";
    return f.kennzeichen ? `${f.name} (${f.kennzeichen})` : f.name;
  }
  return "(Eintrag)";
}

/* -------------------- Trash Drop -------------------- */

function setupTrash() {
  els.trash.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    els.trash.classList.add("over");
  });
  els.trash.addEventListener("dragleave", () => els.trash.classList.remove("over"));
  els.trash.addEventListener("drop", async (ev) => {
    ev.preventDefault();
    els.trash.classList.remove("over");

    const data = getDragData(ev);
    if (!data) return;

    if (data.kind === "magnet") {
      if (data.typ === "mitarbeiter") return deleteMitarbeiter(data.item_id);
      if (data.typ === "fahrzeug") return deleteFahrzeug(data.item_id);
    }
    if (data.kind === "assignment") {
      return deleteAssignment(data.assignment_id);
    }
  });
}

/* -------------------- Events -------------------- */

function setupEvents() {
  els.btnReload.addEventListener("click", loadAll);

  els.btnAddEmp.addEventListener("click", async () => {
    await addMitarbeiter(els.empName.value);
    els.empName.value = "";
    els.empName.focus();
  });
  els.empName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.btnAddEmp.click();
  });

  els.btnAddVeh.addEventListener("click", async () => {
    await addFahrzeug(els.vehName.value, els.vehPlate.value);
    els.vehName.value = "";
    els.vehPlate.value = "";
    els.vehName.focus();
  });
  els.vehPlate.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.btnAddVeh.click();
  });

  els.btnAddProj.addEventListener("click", async () => {
    await addProjekt(els.projName.value);
    els.projName.value = "";
    els.projName.focus();
  });
  els.projName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") els.btnAddProj.click();
  });

  els.startKw.addEventListener("change", async () => {
    await loadEinsatzplanForView();
    renderBoardOnly();
  });
}

/* -------------------- Start -------------------- */

setupTrash();
setupEvents();
loadAll();
