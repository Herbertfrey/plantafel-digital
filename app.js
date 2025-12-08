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

