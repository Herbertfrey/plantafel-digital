// app.js
// Zentrale Logik für die Plantafel

import { supabase } from "./supabase.js";

// --- STATE -------------------------------------------------------

const state = {
  baustellen: [],
  mitarbeiter: [],
  fahrzeuge: [],
  plantafel: [],
  startDate: getMonday(new Date()),
  rangeDays: 7, // aktuell 1 Woche
};

// --- DOM-ELEMENTE -----------------------------------------------

const statusBar = document.getElementById("statusBar");
const boardGrid = document.getElementById("boardGrid");
const startDateInput = document.getElementById("startDate");

const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const todayBtn = document.getElementById("todayBtn");
const reloadBtn = document.getElementById("reloadBtn");
const backupBtn = document.getElementById("backupBtn");
const stammdatenBtn = document.getElementById("stammdatenBtn");
const newEntryBtn = document.getElementById("newEntryBtn");

const viewButtons = document.querySelectorAll(".view-btn");

// Dialog: Eintrag
const entryDialog = document.getElementById("entryDialog");
const entryDialogTitle = document.getElementById("entryDialogTitle");
const entryForm = document.getElementById("entryForm");
const entryIdInput = document.getElementById("entryId");
const entryDateInput = document.getElementById("entryDate");
const entryVonInput = document.getElementById("entryVon");
const entryBisInput = document.getElementById("entryBis");
const entryTitelInput = document.getElementById("entryTitel");
const entryBaustelleSelect = document.getElementById("entryBaustelle");
const entryMitarbeiterSelect = document.getElementById("entryMitarbeiter");
const entryFahrzeugSelect = document.getElementById("entryFahrzeug");
const entryStatusSelect = document.getElementById("entryStatus");
const entryNotizInput = document.getElementById("entryNotiz");
const entryIsDetailedCheckbox = document.getElementById("entryIsDetailed");
const entryCancelBtn = document.getElementById("entryCancelBtn");
const entryDeleteBtn = document.getElementById("entryDeleteBtn");

// Dialog: Stammdaten
const stammdatenDialog = document.getElementById("stammdatenDialog");
const stammdatenCloseBtn = document.getElementById("stammdatenCloseBtn");

const baustellenList = document.getElementById("baustellenList");
const mitarbeiterList = document.getElementById("mitarbeiterList");
const fahrzeugeList = document.getElementById("fahrzeugeList");

const newBaustelleNameInput = document.getElementById("newBaustelleName");
const newMitarbeiterNameInput = document.getElementById("newMitarbeiterName");
const newFahrzeugNameInput = document.getElementById("newFahrzeugName");

const addBaustelleBtn = document.getElementById("addBaustelleBtn");
const addMitarbeiterBtn = document.getElementById("addMitarbeiterBtn");
const addFahrzeugBtn = document.getElementById("addFahrzeugBtn");

// --- HILFSFUNKTIONEN DATUM --------------------------------------

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=So, 1=Mo, ...
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateDotted(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// --- SUPABASE CALLS ---------------------------------------------

async function loadTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase Fehler:", table, error);
    statusBar.textContent = `Fehler beim Laden der Tabelle ${table}: ${error.message}`;
    return [];
  }
  return data || [];
}

async function loadAllData() {
  statusBar.textContent = "Lade Daten...";

  const [baustellen, mitarbeiter, fahrzeuge, plantafel] = await Promise.all([
    loadTable("baustellen"),
    loadTable("mitarbeiter"),
    loadTable("fahrzeuge"),
    loadTable("plantafel"),
  ]);

  state.baustellen = baustellen;
  state.mitarbeiter = mitarbeiter;
  state.fahrzeuge = fahrzeuge;
  state.plantafel = plantafel;

  console.log("BAUSTELLEN:", baustellen);
  console.log("FAHRZEUGE:", fahrzeuge);
  console.log("MITARBEITER:", mitarbeiter);
  console.log("PLANTAFEL:", plantafel);

  fillEntryDialogStammdaten();
  renderBoard();
  renderStatus();
}

// --- RENDERING --------------------------------------------------

function renderStatus() {
  if (state.plantafel.length === 0) {
    statusBar.textContent = "Keine Daten vorhanden.";
  } else {
    const start = toISODate(state.startDate);
    const end = toISODate(addDays(state.startDate, state.rangeDays - 1));
    statusBar.textContent = `Zeitraum: ${formatDateDotted(start)} bis ${formatDateDotted(
      end
    )}, Einträge insgesamt: ${state.plantafel.length}`;
  }
}

function renderBoard() {
  boardGrid.innerHTML = "";

  const monday = getMonday(state.startDate);
  startDateInput.value = toISODate(monday);

  // Für 5 Tage (Mo–Fr) Spalten erzeugen
  for (let i = 0; i < 5; i++) {
    const dayDate = addDays(monday, i);
    const iso = toISODate(dayDate);

    const column = document.createElement("div");
    column.className = "day-column";
    column.dataset.date = iso;

    const header = document.createElement("div");
    header.className = "day-column-header";
    header.textContent = `${formatDateDotted(iso)}`;

    const body = document.createElement("div");
    body.className = "day-column-body";

    // Doppelklick auf Tag -> neuer Eintrag für diesen Tag
    body.addEventListener("dblclick", () => openEntryDialogForNew(iso));

    // Einträge für diesen Tag
    const entriesForDay = state.plantafel
      .filter((e) => entryIsOnDate(e, iso))
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));

    if (entriesForDay.length === 0) {
      const empty = document.createElement("div");
      empty.className = "entry empty";
      empty.textContent = "— keine Einträge —";
      body.appendChild(empty);
    } else {
      for (const entry of entriesForDay) {
        const card = renderEntryCard(entry);
        body.appendChild(card);
      }
    }

    column.appendChild(header);
    column.appendChild(body);
    boardGrid.appendChild(column);
  }
}

// Prüft, ob ein Eintrag an einem bestimmten Datum angezeigt werden soll
function entryIsOnDate(entry, dateISO) {
  // 1. falls tag gesetzt ist -> nur an diesem Tag
  if (entry.tag) {
    return entry.tag === dateISO;
  }

  const von = entry.von || null;
  const bis = entry.bis || null;

  if (von && bis) return dateISO >= von && dateISO <= bis;
  if (von && !bis) return dateISO >= von;
  if (!von && bis) return dateISO <= bis;

  return false;
}

function renderEntryCard(entry) {
  const div = document.createElement("div");
  div.className = "entry";

  const status = (entry.status || "normal").toLowerCase();

  if (status === "urlaub") div.classList.add("status-urlaub");
  else if (status === "krank") div.classList.add("status-krank");
  else if (status === "schule") div.classList.add("status-schule");
  else if (status === "fahrzeug") div.classList.add("status-fahrzeug");
  else div.classList.add("status-normal");

  const titel = entry.titel || "(kein Titel)";
  const baustelle = entry.baustelle || "-";
  const fahrzeug = entry.fahrzeug || "-";
  const mitarbeiter = entry.mitarbeiter || "-";
  const notiz = entry.notiz || "";

  div.innerHTML = `
    <div class="entry-title">${titel}</div>
    <div class="entry-row"><span class="label">Baustelle:</span> ${baustelle}</div>
    <div class="entry-row"><span class="label">Mitarbeiter:</span> ${mitarbeiter}</div>
    <div class="entry-row"><span class="label">Fahrzeug:</span> ${fahrzeug}</div>
    <div class="entry-row"><span class="label">Status:</span> ${status}</div>
    ${
      notiz
        ? `<div class="entry-row"><span class="label">Notiz:</span> ${notiz}</div>`
        : ""
    }
  `;

  div.addEventListener("click", () => openEntryDialogForEdit(entry));

  return div;
}

// --- EINTRAG-DIALOG ---------------------------------------------

function fillEntryDialogStammdaten() {
  // Baustellen
  entryBaustelleSelect.innerHTML = `<option value="">(keine)</option>`;
  for (const b of state.baustellen) {
    const opt = document.createElement("option");
    opt.value = b.name;
    opt.textContent = b.name;
    entryBaustelleSelect.appendChild(opt);
  }

  // Mitarbeiter
  entryMitarbeiterSelect.innerHTML = "";
  for (const m of state.mitarbeiter) {
    const opt = document.createElement("option");
    opt.value = m.name;
    opt.textContent = m.name;
    entryMitarbeiterSelect.appendChild(opt);
  }

  // Fahrzeuge
  entryFahrzeugSelect.innerHTML = `<option value="">(kein Fahrzeug)</option>`;
  for (const f of state.fahrzeuge) {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = f.name;
    entryFahrzeugSelect.appendChild(opt);
  }
}

function openEntryDialogForNew(dateISO) {
  const d = dateISO || toISODate(new Date());

  entryDialogTitle.textContent = "Neuer Eintrag";
  entryIdInput.value = "";
  entryDateInput.value = d;
  entryVonInput.value = d;
  entryBisInput.value = d;
  entryTitelInput.value = "";
  entryBaustelleSelect.value = "";
  entryMitarbeiterSelect.selectedIndex = -1;
  entryFahrzeugSelect.value = "";
  entryStatusSelect.value = "normal";
  entryNotizInput.value = "";
  entryIsDetailedCheckbox.checked = false;
  entryDeleteBtn.style.display = "none";

  entryDialog.classList.remove("hidden");
}

function openEntryDialogForEdit(entry) {
  entryDialogTitle.textContent = "Eintrag bearbeiten";
  entryIdInput.value = entry.id;
  entryDateInput.value = entry.tag || entry.von || toISODate(new Date());
  entryVonInput.value = entry.von || entry.tag || "";
  entryBisInput.value = entry.bis || entry.tag || "";

  entryTitelInput.value = entry.titel || "";
  entryBaustelleSelect.value = entry.baustelle || "";

  // Mitarbeiter (als Text, durch Komma getrennt)
  const mitarbeiter = (entry.mitarbeiter || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const option of entryMitarbeiterSelect.options) {
    option.selected = mitarbeiter.includes(option.value);
  }

  entryFahrzeugSelect.value = entry.fahrzeug || "";
  entryStatusSelect.value = (entry.status || "normal").toLowerCase();
  entryNotizInput.value = entry.notiz || "";
  entryIsDetailedCheckbox.checked = !!entry.is_detailed;

  entryDeleteBtn.style.display = "inline-block";
  entryDialog.classList.remove("hidden");
}

function closeEntryDialog() {
  entryDialog.classList.add("hidden");
}

entryCancelBtn.addEventListener("click", closeEntryDialog);

entryDeleteBtn.addEventListener("click", async () => {
  const id = entryIdInput.value;
  if (!id) return;

  if (!confirm("Diesen Eintrag wirklich löschen?")) return;

  const { error } = await supabase.from("plantafel").delete().eq("id", id);
  if (error) {
    alert("Fehler beim Löschen: " + error.message);
    return;
  }

  // Aus lokalem State entfernen
  state.plantafel = state.plantafel.filter((e) => e.id !== id);
  closeEntryDialog();
  renderBoard();
  renderStatus();
});

entryForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const id = entryIdInput.value || null;
  const tag = entryDateInput.value;
  let von = entryVonInput.value;
  let bis = entryBisInput.value;

  if (!von) von = tag;
  if (!bis) bis = tag;

  const titel = entryTitelInput.value.trim();
  const baustelle = entryBaustelleSelect.value || null;

  const mitarbeiterValues = Array.from(entryMitarbeiterSelect.selectedOptions).map(
    (o) => o.value
  );
  const mitarbeiter =
    mitarbeiterValues.length > 0 ? mitarbeiterValues.join(", ") : null;

  const fahrzeug = entryFahrzeugSelect.value || null;
  const status = entryStatusSelect.value || "normal";
  const notiz = entryNotizInput.value.trim() || null;
  const is_detailed = entryIsDetailedCheckbox.checked;

  const payload = {
    tag,
    von,
    bis,
    titel,
    baustelle,
    mitarbeiter,
    fahrzeug,
    status,
    notiz,
    is_detailed,
  };

  let error;

  if (id) {
    // Update
    ({ error } = await supabase.from("plantafel").update(payload).eq("id", id));
  } else {
    // Sort: einfache Reihenfolge
    payload.sort = (state.plantafel[state.plantafel.length - 1]?.sort || 0) + 1;
    const { data, error: insertError } = await supabase
      .from("plantafel")
      .insert(payload)
      .select()
      .single();
    error = insertError;
    if (!error && data) {
      state.plantafel.push(data);
    }
  }

  if (error) {
    alert("Fehler beim Speichern: " + error.message);
    return;
  }

  // Bei Update: Daten neu laden, damit alles stimmt
  await loadAllData();
  closeEntryDialog();
});

// --- STAMMDATEN-DIALOG ------------------------------------------

function openStammdatenDialog() {
  renderStammdatenLists();
  stammdatenDialog.classList.remove("hidden");
}

function closeStammdatenDialog() {
  stammdatenDialog.classList.add("hidden");
}

stammdatenCloseBtn.addEventListener("click", closeStammdatenDialog);

function renderStammdatenLists() {
  // Baustellen
  baustellenList.innerHTML = "";
  for (const b of state.baustellen) {
    const li = document.createElement("li");
    li.textContent = b.name;
    baustellenList.appendChild(li);
  }

  // Mitarbeiter
  mitarbeiterList.innerHTML = "";
  for (const m of state.mitarbeiter) {
    const li = document.createElement("li");
    li.textContent = m.name;
    mitarbeiterList.appendChild(li);
  }

  // Fahrzeuge
  fahrzeugeList.innerHTML = "";
  for (const f of state.fahrzeuge) {
    const li = document.createElement("li");
    li.textContent = f.name;
    fahrzeugeList.appendChild(li);
  }
}

async function addSimpleRow(table, name) {
  if (!name.trim()) return;

  const { data, error } = await supabase
    .from(table)
    .insert({ name })
    .select()
    .single();
  if (error) {
    alert(`Fehler beim Anlegen in ${table}: ` + error.message);
    return;
  }

  state[table] = [...state[table], data];
  renderStammdatenLists();
  fillEntryDialogStammdaten();
}

addBaustelleBtn.addEventListener("click", () => {
  addSimpleRow("baustellen", newBaustelleNameInput.value);
  newBaustelleNameInput.value = "";
});

addMitarbeiterBtn.addEventListener("click", () => {
  addSimpleRow("mitarbeiter", newMitarbeiterNameInput.value);
  newMitarbeiterNameInput.value = "";
});

addFahrzeugBtn.addEventListener("click", () => {
  addSimpleRow("fahrzeuge", newFahrzeugNameInput.value);
  newFahrzeugNameInput.value = "";
});

// --- BACKUP -----------------------------------------------------

backupBtn.addEventListener("click", () => {
  const backup = {
    created_at: new Date().toISOString(),
    baustellen: state.baustellen,
    mitarbeiter: state.mitarbeiter,
    fahrzeuge: state.fahrzeuge,
    plantafel: state.plantafel,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plantafel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- TOOLBAR EVENTS ---------------------------------------------

prevWeekBtn.addEventListener("click", () => {
  state.startDate = addDays(state.startDate, -7);
  renderBoard();
  renderStatus();
});

nextWeekBtn.addEventListener("click", () => {
  state.startDate = addDays(state.startDate, 7);
  renderBoard();
  renderStatus();
});

todayBtn.addEventListener("click", () => {
  state.startDate = getMonday(new Date());
  renderBoard();
  renderStatus();
});

startDateInput.addEventListener("change", () => {
  const val = startDateInput.value;
  if (!val) return;
  state.startDate = getMonday(new Date(val));
  renderBoard();
  renderStatus();
});

reloadBtn.addEventListener("click", loadAllData);

stammdatenBtn.addEventListener("click", openStammdatenDialog);

newEntryBtn.addEventListener("click", () => openEntryDialogForNew());

// Ansicht-Schalter
viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    viewButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.rangeDays = Number(btn.dataset.range) || 7;
    renderStatus();
  });
});

// --- START ------------------------------------------------------

(async function init() {
  // Standard: 1 Woche aktiv
  viewButtons.forEach((b) => {
    if (Number(b.dataset.range) === 7) b.classList.add("active");
  });

  state.startDate = getMonday(new Date());
  await loadAllData();
})();
