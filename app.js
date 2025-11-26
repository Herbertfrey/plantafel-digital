// ===================================================================
// SUPABASE INITIALISIERUNG
// ===================================================================

const SUPA_URL = "https://mtybmrkyhavxpvwysglo.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10eWJtcmt5aGF2eHB2d3lzZ2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjQ1OTIsImV4cCI6MjA3Nzc0MDU5Mn0.UToAmJAvACYvnO9hCIeyfm-VYKr5jincXdnEDDtbhvo";

const supa = supabase.createClient(SUPA_URL, SUPA_KEY);


// ===================================================================
// GLOBALE VARIABLEN
// ===================================================================

let eintraege = [];
let mitarbeiter = [];
let fahrzeuge = [];
let baustellen = [];
let currentView = "14d";

// ===================================================================
// FARBE FÜR MITARBEITER
// ===================================================================

function colorFromName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return `hsl(${h % 360},70%,45%)`;
}

// ===================================================================
// DATEN LADEN
// ===================================================================

async function loadAll() {

  const { data: e } = await supa.from("plantafel").select().order("tag");
  const { data: m } = await supa.from("mitarbeiter").select().order("name");
  const { data: f } = await supa.from("fahrzeuge").select().order("name");
  const { data: b } = await supa.from("baustellen").select().order("name");

  eintraege = e ?? [];
  mitarbeiter = m ?? [];
  fahrzeuge = f ?? [];
  baustellen = b ?? [];

  renderBoard();
}

// ===================================================================
// HTML RENDERING
// ===================================================================

function renderBoard() {
  const box = document.getElementById("boardContainer");
  box.innerHTML = "";

  const start = new Date(startDate.value);

  if (currentView === "14d") render14(start);
  if (currentView === "4w") render4Weeks(start);
  if (currentView === "12m") render12(start);
}

// ===================================================================
// 14 TAGE
// ===================================================================

function render14(start) {
  const wrap = document.createElement("div");
  wrap.className = "view-grid";

  let d = new Date(start);
  let count = 0;

  while (count < 14) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      wrap.appendChild(renderDayBox(d));
      count++;
    }
    d.setDate(d.getDate() + 1);
  }

  boardContainer.appendChild(wrap);
}

// ===================================================================
// 4 WOCHEN
// ===================================================================

function render4Weeks(start) {
  const wrap = document.createElement("div");
  wrap.className = "view-grid";

  // Montag Start
  let d = new Date(start);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);

  for (let i = 0; i < 20; i++) {
    wrap.appendChild(renderDayBox(d));
    d.setDate(d.getDate() + 1);
  }

  boardContainer.appendChild(wrap);
}

// ===================================================================
// 12 MONATE
// ===================================================================

function render12(start) {
  const wrap = document.createElement("div");
  wrap.className = "months-grid";

  let year = start.getFullYear();

  for (let m = 0; m < 12; m++) {
    const div = document.createElement("div");
    div.className = "month-box";

    div.innerHTML = `
      <div class="month-head">
        ${new Date(year, m, 1).toLocaleString("de-DE", {month:"long",year:"numeric"})}
      </div>
    `;

    let inside = document.createElement("div");

    eintraege.filter(x => {
      let d = new Date(x.tag);
      return d.getFullYear() === year && d.getMonth() === m;
    }).forEach(x => {
      inside.appendChild(renderEntry(x));
    });

    div.appendChild(inside);
    wrap.appendChild(div);
  }

  boardContainer.appendChild(wrap);
}

// ===================================================================
// DAY BOX
// ===================================================================

function renderDayBox(date) {
  const box = document.createElement("div");
  const ds = date.toISOString().slice(0, 10);

  box.className = "day-box";
  box.innerHTML = `
    <div class="day-head">
      ${date.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}
    </div>
  `;

  const list = document.createElement("div");

  eintraege.filter(e => e.tag === ds).forEach(e => {
    list.appendChild(renderEntry(e));
  });

  box.appendChild(list);

  box.onclick = () => openEntryDialog({tag:ds});

  return box;
}

// ===================================================================
// ENTRY CARD
// ===================================================================

function renderEntry(e) {
  let div = document.createElement("div");
  div.className = "entry";

  let c = e.mitarbeiter?.split(",")[0]?.trim() || "";
  div.style.borderLeft = `6px solid ${colorFromName(c)}`;

  div.innerHTML = `
    <div class="entry-title">${e.titel}</div>
    <div class="entry-people">${e.mitarbeiter}</div>
    <div class="entry-btns">
      <span class="edit-btn">✏️</span>
      <span class="del-btn">🗑️</span>
    </div>
  `;

  div.querySelector(".edit-btn").onclick = ev => {
    ev.stopPropagation();
    openEntryDialog(e);
  };

  div.querySelector(".del-btn").onclick = ev => {
    ev.stopPropagation();
    deleteEntry(e.id);
  };

  return div;
}

// ===================================================================
// DIALOG FUNKTIONEN
// ===================================================================

window.openEntryDialog = function(data={}) {

  entryDialog.showModal();

  eId.value = data.id ?? "";
  eVon.value = data.tag ?? startDate.value;
  eTitel.value = data.titel ?? "";
  eNotiz.value = data.notiz ?? "";

  renderCheckboxes("#eMitarbeiter", mitarbeiter, data.mitarbeiter);
  renderCheckboxes("#eFahrzeuge", fahrzeuge, data.fahrzeug);
}

function renderCheckboxes(sel, arr, current) {
  const div = document.querySelector(sel);
  div.innerHTML = "";

  arr.forEach(x=>{
    let lbl = document.createElement("label");
    lbl.innerHTML = `<input type="checkbox" value="${x.name}">${x.name}`;
    if (current?.includes(x.name)) lbl.querySelector("input").checked = true;
    div.appendChild(lbl);
  });
}

// ===================================================================
// SPEICHERN
// ===================================================================

entryForm.onsubmit = async evt => {
  evt.preventDefault();

  const id = eId.value;

  const payload = {
    titel:eTitel.value,
    tag:eVon.value,
    mitarbeiter: getChecked("#eMitarbeiter"),
    fahrzeug:getChecked("#eFahrzeuge"),
    notiz:eNotiz.value
  };

  if (!id) {
    await supa.from("plantafel").insert(payload);
  } else {
    await supa.from("plantafel").update(payload).eq("id", id);
  }

  entryDialog.close();
  loadAll();
};

function getChecked(sel){
  return [...document.querySelectorAll(sel+" input:checked")]
         .map(x=>x.value).join(", ");
}

// ===================================================================
// LÖSCHEN
// ===================================================================

window.deleteEntry = async function(id){
  await supa.from("plantafel").delete().eq("id", id);
  loadAll();
};

// ===================================================================
// INIT
// ===================================================================

window.onload = () => {
  startDate.value = new Date().toISOString().slice(0,10);
  loadAll();
};
