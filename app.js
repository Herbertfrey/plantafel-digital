// app.js
// Tabs, Formular, 4-KW-Board, Drag & Drop

let allEntries = [];
let currentBaseKw = null; // erste KW im 4er-Block

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initForm();
  initWeekControls();
  initYearBoardSkeleton();
  refreshData();
});

// ---------- Tabs ----------

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + tab).classList.add("active");
    });
  });
}

// ---------- Jahr-Board (nur Rahmen vorerst) ----------

function initYearBoardSkeleton() {
  const months = [
    "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
  ];
  const yearBoard = document.getElementById("year-board");
  months.forEach((m) => {
    const box = document.createElement("div");
    box.className = "year-month";
    const h = document.createElement("h3");
    h.textContent = m;
    box.appendChild(h);
    const p = document.createElement("div");
    p.className = "small-text";
    p.textContent = "Jahresplanung kommt später.";
    box.appendChild(p);
    yearBoard.appendChild(box);
  });
}

// ---------- Daten laden & rendern ----------

async function refreshData() {
  setStatus("Lade Daten …");
  allEntries = await window.plantafelApi.loadPlantafelEntries();
  if (!currentBaseKw) {
    currentBaseKw = getIsoWeek(new Date());
  }
  renderWeekBoard();
  setStatus("Einträge geladen.");
}

// ---------- Formular ----------

function initForm() {
  const form = document.getElementById("entry-form");
  const resetBtn = document.getElementById("resetBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleSave();
  });

  resetBtn.addEventListener("click", () => {
    fillForm(null);
  });

  deleteBtn.addEventListener("click", async () => {
    const id = document.getElementById("entryId").value;
    if (!id) {
      alert("Kein Eintrag ausgewählt zum Löschen.");
      return;
    }
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    await window.plantafelApi.deletePlantafelEntry(id);
    fillForm(null);
    await refreshData();
  });

  // Startzustand
  fillForm(null);
}

function fillForm(entry) {
  document.getElementById("entryId").value = entry ? entry.id || "" : "";

  document.getElementById("vonInput").value = entry && entry.von
    ? toInputDate(entry.von)
    : "";
  document.getElementById("bisInput").value = entry && entry.bis
    ? toInputDate(entry.bis)
    : "";

  document.getElementById("kwInput").value = entry && entry.kw ? entry.kw : "";
  document.getElementById("weekdayInput").value =
    entry && entry.weekday ? entry.weekday : "";

  document.getElementById("titelInput").value = entry?.titel || "";
  document.getElementById("baustelleInput").value = entry?.baustelle || "";
  document.getElementById("mitarbeiterInput").value = entry?.mitarbeiter || "";
  document.getElementById("fahrzeugInput").value = entry?.fahrzeug || "";
  document.getElementById("statusInput").value = entry?.status || "";
  document.getElementById("notizInput").value = entry?.notiz || "";
}

async function handleSave() {
  const id = document.getElementById("entryId").value || null;
  const von = document.getElementById("vonInput").value || null;
  const bis = document.getElementById("bisInput").value || null;
  const kw = parseInt(document.getElementById("kwInput").value, 10) || null;
  const weekday = document.getElementById("weekdayInput").value || null;
  const titel = document.getElementById("titelInput").value.trim();
  const baustelle = document.getElementById("baustelleInput").value.trim();
  const mitarbeiter = document
    .getElementById("mitarbeiterInput")
    .value.trim();
  const fahrzeug = document.getElementById("fahrzeugInput").value.trim();
  const status = document.getElementById("statusInput").value.trim();
  const notiz = document.getElementById("notizInput").value.trim();

  if (!kw || !weekday) {
    alert("Für das Wochenbrett müssen KW und Wochentag gesetzt sein.");
    return;
  }

  const entry = {
    id,
    von: von || null,
    bis: bis || null,
    kw,
    weekday,
    titel,
    baustelle,
    mitarbeiter,
    fahrzeug,
    status,
    notiz,
  };

  setStatus("Speichere …");
  const saved = await window.plantafelApi.savePlantafelEntry(entry);
  if (saved) {
    fillForm(saved);
    await refreshData();
    setStatus("Gespeichert.");
  } else {
    setStatus("Fehler beim Speichern.");
  }
}

// ---------- Wochen-Board ----------

function initWeekControls() {
  document.getElementById("prev4Btn").addEventListener("click", () => {
    currentBaseKw -= 4;
    if (currentBaseKw < 1) currentBaseKw = 1;
    renderWeekBoard();
  });
  document.getElementById("next4Btn").addEventListener("click", () => {
    currentBaseKw += 4;
    if (currentBaseKw > 53) currentBaseKw = 50;
    renderWeekBoard();
  });
  document.getElementById("thisWeekBtn").addEventListener("click", () => {
    currentBaseKw = getIsoWeek(new Date());
    renderWeekBoard();
  });
}

function renderWeekBoard() {
  const container = document.getElementById("week-board");
  container.innerHTML = "";

  const weeks = [currentBaseKw, currentBaseKw + 1, currentBaseKw + 2, currentBaseKw + 3]
    .map((kw) => ((kw - 1 + 53) % 53) + 1); // grob begrenzen 1–53

  const table = document.createElement("table");
  table.className = "week-table";

  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");

  const thEmpty = document.createElement("th");
  thEmpty.textContent = "Tag / KW";
  trHead.appendChild(thEmpty);

  const weekdays = ["Mo", "Di", "Mi", "Do", "Fr"];

  weeks.forEach((kw) => {
    const th = document.createElement("th");
    th.textContent = "KW " + kw;
    trHead.appendChild(th);
  });

  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  weekdays.forEach((wd) => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.className = "weekday-cell";
    tdLabel.textContent = wd;
    tr.appendChild(tdLabel);

    weeks.forEach((kw) => {
      const td = document.createElement("td");
      td.className = "dropzone";
      td.dataset.kw = kw;
      td.dataset.weekday = wd;

      // existierende Einträge in dieser Zelle
      const cellEntries = allEntries.filter(
        (e) => e.kw === kw && e.weekday === wd
      );
      cellEntries.forEach((e) => {
        const card = createCard(e);
        td.appendChild(card);
      });

      // Drag & Drop
      td.addEventListener("dragover", (ev) => {
        ev.preventDefault();
      });
      td.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData("text/plain");
        if (!id) return;
        await moveEntryToCell(id, kw, wd);
      });

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  updateWeekRangeText(weeks);
}

function createCard(entry) {
  const div = document.createElement("div");
  div.className = "card";
  div.draggable = true;
  div.dataset.id = entry.id;

  const header = document.createElement("div");
  header.className = "card-header";
  header.textContent = entry.titel || "(ohne Titel)";
  div.appendChild(header);

  const meta1 = document.createElement("div");
  meta1.className = "card-meta";
  meta1.textContent = entry.baustelle || "";
  div.appendChild(meta1);

  const meta2 = document.createElement("div");
  meta2.className = "card-meta";
  meta2.textContent =
    (entry.mitarbeiter || "") + (entry.fahrzeug ? " | " + entry.fahrzeug : "");
  div.appendChild(meta2);

  div.addEventListener("dragstart", (ev) => {
    ev.dataTransfer.setData("text/plain", entry.id);
  });

  div.addEventListener("click", () => {
    fillForm(entry);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  return div;
}

async function moveEntryToCell(id, kw, weekday) {
  const entry = allEntries.find((e) => e.id === id);
  if (!entry) return;

  const updated = { ...entry, kw, weekday };
  const saved = await window.plantafelApi.savePlantafelEntry(updated);
  if (saved) {
    // in localem Array ersetzen
    const idx = allEntries.findIndex((e) => e.id === id);
    if (idx !== -1) allEntries[idx] = saved;
    renderWeekBoard();
  }
}

// ---------- Hilfsfunktionen ----------

function setStatus(msg) {
  const el = document.getElementById("statusText");
  if (el) el.textContent = msg || "";
}

function toInputDate(value) {
  if (!value) return "";
  // Supabase liefert ggf. ISO-String
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ISO-KW (vereinfachte Variante – reicht hier völlig)
function getIsoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function updateWeekRangeText(weeks) {
  const el = document.getElementById("weekRangeText");
  if (!el) return;
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  el.textContent = `Zeitraum: KW ${first} – KW ${last}`;
}
