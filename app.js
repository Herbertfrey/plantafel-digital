// Hauptlogik: Tabs, Listen, Jahresbrett, Wochenbrett (4 KW), Drag & Drop

// --------------------- GLOBALE VARIABLEN ------------------------

let allEntries = [];
let allMitarbeiter = [];
let allFahrzeuge = [];
let currentEditId = null;

let baseKw = isoWeek(new Date());  // Start für Wochenbrett 4 KW
const weekSpan = 4;                // Immer 4 Wochen

let draggedEntryId = null;

// Monats-Definition für Jahresbrett
const monthsDef = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mär" },
  { key: "apr", label: "Apr" },
  { key: "mai", label: "Mai" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "aug", label: "Aug" },
  { key: "sep", label: "Sep" },
  { key: "okt", label: "Okt" },
  { key: "nov", label: "Nov" },
  { key: "dez", label: "Dez" }
];

// Kategorien für Jahresbrett rechts
const yearCategoriesDef = [
  { key: "kleinigkeiten", label: "Kleinigkeiten" },
  { key: "sanierung", label: "Sanierungen" },
  { key: "pv", label: "PV" },
  { key: "flachdach", label: "Flachdach" },
  { key: "sonst", label: "Sonstiges" }
];

// --------------------- HILFSFUNKTIONEN FÜR KARTEN ------------------------

function getMitarbeiterColor(mitarbeiterStr) {
  const name = normalizeFirstFromList(mitarbeiterStr);
  if (!name) return null;
  const found = allMitarbeiter.find(ma => normalizeName(ma.name) === name);
  return found ? found.color : null;
}

function getFahrzeugColor(fahrzeugStr) {
  if (!fahrzeugStr) return null;
  const val = normalizeName(fahrzeugStr);
  if (!val) return null;
  const found = allFahrzeuge.find(fz =>
    normalizeName(fz.name) === val ||
    normalizeName(fz.kennzeichen || "") === val
  );
  return found ? found.color : null;
}

// Karte erstellen (für Wochen- und Jahresbrett)
function createCardElement(entry) {
  const card = document.createElement("div");
  card.className = "card";
  card.draggable = true;
  card.dataset.entryId = entry.id;

  card.addEventListener("dragstart", () => { draggedEntryId = entry.id; });
  card.addEventListener("dragend", () => { draggedEntryId = null; });
  card.addEventListener("click", () => fillForm(entry));

  const title = entry.baustelle || entry.titel || "Ohne Titel";
  const fahr = entry.fahrzeug || "";
  const mit = entry.mitarbeiter || "";
  const stat = (entry.status || "").toLowerCase();

  const maColor = getMitarbeiterColor(mit);
  const fzColor = getFahrzeugColor(fahr);
  const stripeColor = maColor || fzColor || null;

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const strip = document.createElement("div");
  strip.className = "card-color-strip";
  if (stripeColor) strip.style.background = stripeColor;

  const content = document.createElement("div");
  content.className = "card-content";
  content.innerHTML = `
    <div class="card-title">${title}</div>
    <div class="card-line card-meta">Fzg: ${fahr}</div>
    <div class="card-line card-meta">MA: ${mit}</div>
    ${stat ? `<div class="card-line"><span class="status-badge">${stat}</span></div>` : ""}
  `;

  inner.appendChild(strip);
  inner.appendChild(content);
  card.appendChild(inner);

  return card;
}

// --------------------- LISTE & FORMULAR ------------------------

function renderList() {
  const tbody = document.querySelector("#listTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  allEntries.forEach(entry => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(entry.tag || entry.von)}</td>
      <td>${formatDate(entry.bis)}</td>
      <td>${entry.titel || ""}</td>
      <td>${entry.baustelle || ""}</td>
      <td>${entry.mitarbeiter || ""}</td>
      <td>${entry.fahrzeug || ""}</td>
      <td>${entry.status || ""}</td>
    `;
    tr.addEventListener("click", () => fillForm(entry));
    tbody.appendChild(tr);
  });
}

function fillForm(entry) {
  currentEditId = entry.id;

  document.getElementById("tagInput").value = entry.tag || "";
  document.getElementById("bereichInput").value = entry.bereich || "";
  document.getElementById("vonInput").value = entry.von || "";
  document.getElementById("bisInput").value = entry.bis || "";
  document.getElementById("kwInput").value = entry.kw || "";
  document.getElementById("weekdayInput").value = entry.weekday || "";
  document.getElementById("titelInput").value = entry.titel || "";
  document.getElementById("baustelleInput").value = entry.baustelle || "";
  document.getElementById("mitarbeiterInput").value = entry.mitarbeiter || "";
  document.getElementById("fahrzeugInput").value = entry.fahrzeug || "";
  document.getElementById("statusInput").value = entry.status || "";
  document.getElementById("notizInput").value = entry.notiz || "";

  document.getElementById("statusInfo").textContent =
    "Eintrag geladen – Änderungen nicht vergessen zu speichern.";
}

function resetForm() {
  currentEditId = null;
  document.getElementById("tagInput").value = "";
  document.getElementById("bereichInput").value = "";
  document.getElementById("vonInput").value = "";
  document.getElementById("bisInput").value = "";
  document.getElementById("kwInput").value = "";
  document.getElementById("weekdayInput").value = "";
  document.getElementById("titelInput").value = "";
  document.getElementById("baustelleInput").value = "";
  document.getElementById("mitarbeiterInput").value = "";
  document.getElementById("fahrzeugInput").value = "";
  document.getElementById("statusInput").value = "";
  document.getElementById("notizInput").value = "";

  const si = document.getElementById("statusInfo");
  if (si) si.textContent = "Neuer Eintrag.";
}

async function saveEntry() {
  const tag = document.getElementById("tagInput").value || null;
  const bereich = document.getElementById("bereichInput").value.trim() || null;
  const von = document.getElementById("vonInput").value || null;
  const bis = document.getElementById("bisInput").value || null;
  let kw = parseInt(document.getElementById("kwInput").value, 10);
  let weekday = document.getElementById("weekdayInput").value || null;

  const titel = document.getElementById("titelInput").value.trim();
  const baustelle = document.getElementById("baustelleInput").value.trim();
  const mitarbeiter = document.getElementById("mitarbeiterInput").value.trim();
  const fahrzeug = document.getElementById("fahrzeugInput").value.trim();
  const status = document.getElementById("statusInput").value.trim();
  const notiz = document.getElementById("notizInput").value.trim();

  // Automatische KW/Wochentag-Berechnung bei Tag gesetzt
  if ((!kw || kw < 1 || kw > 53) && tag) {
    kw = isoWeek(new Date(tag));
    document.getElementById("kwInput").value = kw;
  }

  if (!weekday && tag) {
    const d = new Date(tag);
    const wd = d.getDay(); // So=0, Mo=1...
    const map = ["so", "mo", "di", "mi", "do", "fr", "sa"];
    weekday = map[wd];
    if (!["mo", "di", "mi", "do", "fr"].includes(weekday)) {
      weekday = null;
    } else {
      document.getElementById("weekdayInput").value = weekday;
    }
  }

  const entry = {
    tag,
    bereich,
    von,
    bis,
    kw: kw || null,
    weekday,
    titel,
    baustelle,
    mitarbeiter,
    fahrzeug,
    status,
    notiz
  };

  try {
    await upsertPlantafelEntry(entry, currentEditId);
    document.getElementById("statusInfo").textContent = "Gespeichert.";
    await reloadAll();
    resetForm();
  } catch (err) {
    alert("Fehler beim Speichern (Supabase).");
  }
}

async function deleteEntry() {
  if (!currentEditId) {
    alert("Kein Eintrag ausgewählt.");
    return;
  }
  if (!confirm("Diesen Eintrag wirklich löschen?")) return;

  try {
    await deletePlantafelEntry(currentEditId);
    document.getElementById("statusInfo").textContent = "Eintrag gelöscht.";
    await reloadAll();
    resetForm();
  } catch (err) {
    alert("Fehler beim Löschen (Supabase).");
  }
}
// --------------------- WOCHENBRETT (4 KW) ------------------------

async function moveEntryToKwWeekday(entryId, kw, weekday) {
  try {
    await patchPlantafelEntry(entryId, { kw, weekday });
    await reloadAll();
  } catch (err) {
    alert("Fehler beim Verschieben im Wochenbrett.");
  }
}

function renderWeekView() {
  const table = document.getElementById("weekTable");
  if (!table) return;
  table.innerHTML = "";

  const year = new Date().getFullYear();

  const cap = document.getElementById("weekCaption");
  const kwList = [];
  for (let i = 0; i < weekSpan; i++) kwList.push(baseKw + i);
  cap.textContent = "KW " + kwList.join(" – ");

  const weekdays = [
    { key: "mo", label: "Mo" },
    { key: "di", label: "Di" },
    { key: "mi", label: "Mi" },
    { key: "do", label: "Do" },
    { key: "fr", label: "Fr" }
  ];

  // Kopfzeile
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const emptyTh = document.createElement("th");
  emptyTh.textContent = "Tag / KW";
  headRow.appendChild(emptyTh);

  for (let i = 0; i < weekSpan; i++) {
    const kw = baseKw + i;
    const th = document.createElement("th");
    th.className = "week-head";

    const startDate = dateFromIsoWeek(kw, year);
    const endDate = addDays(startDate, 4);

    th.innerHTML = `KW ${kw}<br>${formatDate(startDate)} – ${formatDate(endDate)}`;
    headRow.appendChild(th);
  }

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  weekdays.forEach(wd => {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.className = "week-day-label";
    labelTd.textContent = wd.label;
    tr.appendChild(labelTd);

    for (let i = 0; i < weekSpan; i++) {
      const kw = baseKw + i;
      const td = document.createElement("td");
      td.className = "week-cell";
      td.dataset.kw = kw;
      td.dataset.weekday = wd.key;

      // Dragover / Drop
      td.addEventListener("dragover", ev => {
        ev.preventDefault();
        td.classList.add("dragover");
      });
      td.addEventListener("dragleave", () => {
        td.classList.remove("dragover");
      });
      td.addEventListener("drop", async ev => {
        ev.preventDefault();
        td.classList.remove("dragover");
        if (draggedEntryId) {
          await moveEntryToKwWeekday(draggedEntryId, kw, wd.key);
        }
      });

      const entries = allEntries.filter(e => e.kw === kw && e.weekday === wd.key);
      entries.forEach(e => td.appendChild(createCardElement(e)));

      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

// --------------------- JAHRESÜBERSICHT ------------------------

async function moveEntryToBereich(entryId, bereichKey) {
  try {
    await patchPlantafelEntry(entryId, { bereich: bereichKey });
    await reloadAll();
  } catch (err) {
    alert("Fehler beim Verschieben im Jahresbrett.");
  }
}

function makeYearDropTarget(el, bereichKey) {
  el.addEventListener("dragover", ev => {
    ev.preventDefault();
    el.classList.add("dragover");
  });
  el.addEventListener("dragleave", () => {
    el.classList.remove("dragover");
  });
  el.addEventListener("drop", async ev => {
    ev.preventDefault();
    el.classList.remove("dragover");
    if (draggedEntryId) {
      await moveEntryToBereich(draggedEntryId, bereichKey);
    }
  });
}

function renderYearView() {
  const yearTable = document.getElementById("yearTable");
  const catContainer = document.getElementById("yearCategories");
  if (!yearTable || !catContainer) return;

  yearTable.innerHTML = "";
  catContainer.innerHTML = "";

  const year = new Date().getFullYear();

  // 4 Reihen × 3 Monate
  for (let r = 0; r < 4; r++) {
    const headerRow = document.createElement("tr");
    const row = document.createElement("tr");

    const firstMonthIndex = r * 3;
    const lastMonthIndex = firstMonthIndex + 2;

    const monthStart = new Date(year, firstMonthIndex, 1);
    const monthEnd = new Date(year, lastMonthIndex + 1, 0);

    const kwStart = isoWeek(monthStart);
    const kwEnd = isoWeek(monthEnd);

    // Linke Zelle mit KW-Bereich
    const kwCellHeader = document.createElement("th");
    kwCellHeader.className = "year-kw-cell";
    kwCellHeader.innerHTML = `
      <div class="year-kw-main">KW ${kwStart} – ${kwEnd}</div>
      <div class="year-kw-sub">${formatDate(monthStart)} – ${formatDate(monthEnd)}</div>
    `;
    headerRow.appendChild(kwCellHeader);

    const kwCellRow = document.createElement("td");
    kwCellRow.className = "year-kw-cell";
    row.appendChild(kwCellRow);

    // 3 Monatszellen
    for (let c = 0; c < 3; c++) {
      const monthIndex = r * 3 + c;
      const mDef = monthsDef[monthIndex];

      const th = document.createElement("th");
      th.className = "year-month-header";
      th.textContent = mDef.label;
      headerRow.appendChild(th);

      const td = document.createElement("td");
      td.className = "year-month-cell";

      const title = document.createElement("div");
      title.className = "year-month-title";
      title.textContent = mDef.label;

      const drop = document.createElement("div");
      drop.className = "year-month-drop";
      drop.dataset.bereich = mDef.key;

      makeYearDropTarget(drop, mDef.key);

      const entries = allEntries.filter(e => (e.bereich || "").toLowerCase() === mDef.key);
      entries.forEach(e => drop.appendChild(createCardElement(e)));

      td.appendChild(title);
      td.appendChild(drop);
      row.appendChild(td);
    }

    yearTable.appendChild(headerRow);
    yearTable.appendChild(row);
  }

  // Rechte Kategorien-Spalte
  yearCategoriesDef.forEach(cat => {
    const box = document.createElement("div");
    box.className = "year-cat-box";

    const title = document.createElement("div");
    title.className = "year-cat-title";
    title.textContent = cat.label;

    const drop = document.createElement("div");
    drop.className = "year-cat-drop";
    drop.dataset.bereich = cat.key;

    makeYearDropTarget(drop, cat.key);

    const entries = allEntries.filter(e => (e.bereich || "").toLowerCase() === cat.key);
    entries.forEach(e => drop.appendChild(createCardElement(e)));

    box.appendChild(title);
    box.appendChild(drop);
    catContainer.appendChild(box);
  });
}

// --------------------- URLAUB ------------------------

function renderUrlaub() {
  const container = document.getElementById("urlaubView");
  if (!container) return;
  container.innerHTML = "";

  const urlaubEntries = allEntries.filter(e =>
    (e.status || "").toLowerCase().includes("urlaub")
  );

  if (urlaubEntries.length === 0) {
    container.textContent = "Noch keine Urlaube erfasst.";
    return;
  }

  const byMA = {};
  urlaubEntries.forEach(e => {
    const name = (e.mitarbeiter || "Unbekannt").trim() || "Unbekannt";
    if (!byMA[name]) byMA[name] = [];
    byMA[name].push(e);
  });

  const table = document.createElement("table");
  const thead = document.createElement("thead");

  thead.innerHTML = `
    <tr>
      <th>Mitarbeiter</th>
      <th>Von</th>
      <th>Bis</th>
      <th>Titel / Baustelle</th>
    </tr>
  `;

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  Object.keys(byMA).sort().forEach(name => {
    byMA[name].forEach(e => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${name}</td>
        <td>${formatDate(e.von || e.tag)}</td>
        <td>${formatDate(e.bis || e.von || e.tag)}</td>
        <td>${(e.baustelle || e.titel || "").slice(0, 60)}</td>
      `;

      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// --------------------- STAMMDATEN ------------------------

function renderMitarbeiterTable() {
  const tbody = document.querySelector("#maTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  allMitarbeiter.forEach(ma => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${ma.name || ""}</td>
      <td>
        <span class="color-dot" style="background:${ma.color || "#ffffff"}"></span>
        ${ma.color || ""}
      </td>
    `;

    tr.addEventListener("click", () => {
      document.getElementById("maIdHidden").value = ma.id || "";
      document.getElementById("maNameInput").value = ma.name || "";
      document.getElementById("maColorInput").value = ma.color || "#ffcc00";
    });

    tbody.appendChild(tr);
  });
}

function renderFahrzeugTable() {
  const tbody = document.querySelector("#fzTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  allFahrzeuge.forEach(fz => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${fz.name || ""}</td>
      <td>${fz.kennzeichen || ""}</td>
      <td>
        <span class="color-dot" style="background:${fz.color || "#ffffff"}"></span>
        ${fz.color || ""}
      </td>
    `;

    tr.addEventListener("click", () => {
      document.getElementById("fzIdHidden").value = fz.id || "";
      document.getElementById("fzNameInput").value = fz.name || "";
      document.getElementById("fzKennzInput").value = fz.kennzeichen || "";
      document.getElementById("fzColorInput").value = fz.color || "#ff0000";
    });

    tbody.appendChild(tr);
  });
}

function clearMitarbeiterForm() {
  document.getElementById("maIdHidden").value = "";
  document.getElementById("maNameInput").value = "";
  document.getElementById("maColorInput").value = "#ffcc00";
}

function clearFahrzeugForm() {
  document.getElementById("fzIdHidden").value = "";
  document.getElementById("fzNameInput").value = "";
  document.getElementById("fzKennzInput").value = "";
  document.getElementById("fzColorInput").value = "#ff0000";
}

async function saveMitarbeiter() {
  const id = document.getElementById("maIdHidden").value || null;
  const name = document.getElementById("maNameInput").value.trim();
  const color = document.getElementById("maColorInput").value;

  if (!name) {
    alert("Name darf nicht leer sein.");
    return;
  }

  try {
    await upsertMitarbeiter({ name, color }, id);
    await reloadAll();
  } catch (err) {
    alert("Fehler beim Speichern Mitarbeiter.");
  }
}

async function deleteMitarbeiter() {
  const id = document.getElementById("maIdHidden").value;
  if (!id) {
    alert("Kein Mitarbeiter ausgewählt.");
    return;
  }

  if (!confirm("Mitarbeiter wirklich löschen?")) return;

  try {
    await deleteMitarbeiterRow(id);
    c

