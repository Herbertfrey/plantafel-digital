// Plantafel – 4 Wochen: Tage (Zeilen) × Fahrzeuge (Spalten)
// Erwartung: supabase.js setzt window.db (Supabase Client)

const db = window.db;

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr"];
const VEHICLES = ["DOKA", "MERCEDES BUS", "CRAFTER", "FORD"];

const elBoard = document.getElementById("board");
const elForm = document.getElementById("plantafel-form");

const elKwStart = document.getElementById("kwStart");
const elBtnReload = document.getElementById("btnReload");
const elBtnClearForm = document.getElementById("btnClearForm");

const elKw = document.getElementById("kw");
const elWeekday = document.getElementById("weekday");
const elFahrzeug = document.getElementById("fahrzeug");
const elTitel = document.getElementById("titel");
const elBaustelle = document.getElementById("baustelle");
const elMitarbeiter = document.getElementById("mitarbeiter");
const elStatus = document.getElementById("status");
const elNotiz = document.getElementById("notiz");

function isoWeekNumber(date = new Date()) {
  // ISO week (Mo=Start)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

function wrapKW(kw) {
  // 1..53 (einfaches Wrapping)
  if (kw < 1) return 53;
  if (kw > 53) return 1;
  return kw;
}

function getVisibleKWs() {
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

function vehicleLabelShort(v) {
  // für mobil später ggf. kürzen – erstmal so lassen
  return v;
}

function renderBoardSkeleton() {
  const kws = getVisibleKWs();
  elBoard.innerHTML = "";

  for (const kw of kws) {
    const week = document.createElement("section");
    week.className = "week";
    week.dataset.kw = String(kw);

    week.innerHTML = `
      <div class="week__top">
        <div class="week__title">KW ${kw}</div>
        <div class="week__sub">Drag & Drop</div>
      </div>
      <div class="week__grid">
        <div class="grid__head"></div>
        ${VEHICLES.map(v => `<div class="grid__head">${escapeHtml(vehicleLabelShort(v))}</div>`).join("")}

        ${DAYS.map(day => `
          <div class="grid__rowlabel">${day}</div>
          ${VEHICLES.map(v => `
            <div class="grid__cell">
              <div class="dropzone"
                   data-kw="${kw}"
                   data-day="${day}"
                   data-vehicle="${escapeHtml(v)}"></div>
            </div>
          `).join("")}
        `).join("")}
      </div>
    `;

    elBoard.appendChild(week);
  }

  wireDropzones();
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

      const cardId = e.dataTransfer.getData("text/cardId");
      if (!cardId) return;

      const newKw = Number(zone.dataset.kw);
      const newDay = zone.dataset.day;
      const newVehicle = zone.dataset.vehicle;

      // Optimistisch: Karte direkt verschieben
      const cardEl = document.querySelector(`.carditem[data-id="${CSS.escape(cardId)}"]`);
      if (cardEl) zone.appendChild(cardEl);

      // In DB speichern
      try {
        const { error } = await db
          .from("plantafel")
          .update({ kw: newKw, weekday: newDay, fahrzeug: newVehicle })
          .eq("id", cardId);

        if (error) throw error;
      } catch (err) {
        console.error(err);
        alert("Fehler beim Verschieben ❌");
        // Zur Sicherheit neu laden
        await loadAndRender();
      }
    });
  });
}

function createCardEl(row) {
  const el = document.createElement("div");
  const statusClass = row.status ? `status-${row.status}` : "status-normal";

  el.className = `carditem ${statusClass}`;
  el.draggable = true;
  el.dataset.id = row.id;

  const meta = [
    row.baustelle ? `📍 ${row.baustelle}` : "",
    row.mitarbeiter ? `👷 ${row.mitarbeiter}` : "",
    row.notiz ? `📝 ${row.notiz}` : "",
  ].filter(Boolean).join("<br/>");

  el.innerHTML = `
    <div class="carditem__status"></div>
    <div class="carditem__title">${escapeHtml(row.titel || "")}</div>
    <div class="carditem__meta">${meta}</div>
  `;

  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/cardId", row.id);
    e.dataTransfer.effectAllowed = "move";
  });

  return el;
}

async function loadRowsForVisibleWeeks() {
  const kws = getVisibleKWs();
  // KW-Filter: in(...)
  const { data, error } = await db
    .from("plantafel")
    .select("*")
    .in("kw", kws)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

function placeRows(rows) {
  // Alle Zonen leeren
  elBoard.querySelectorAll(".dropzone").forEach(z => (z.innerHTML = ""));

  for (const r of rows) {
    const kw = Number(r.kw);
    const day = r.weekday;
    const v = r.fahrzeug;

    const zone = elBoard.querySelector(
      `.dropzone[data-kw="${kw}"][data-day="${CSS.escape(day)}"][data-vehicle="${CSS.escape(v)}"]`
    );

    if (!zone) continue;

    zone.appendChild(createCardEl(r));
  }
}

async function loadAndRender() {
  renderBoardSkeleton();
  try {
    const rows = await loadRowsForVisibleWeeks();
    placeRows(rows);
  } catch (err) {
    console.error(err);
    alert("Fehler beim Laden ❌");
  }
}

// --- Form Speichern ---
elForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    kw: Number(elKw.value),
    weekday: elWeekday.value,
    fahrzeug: elFahrzeug.value,
    titel: elTitel.value.trim(),
    baustelle: elBaustelle.value.trim(),
    mitarbeiter: elMitarbeiter.value.trim(),
    status: elStatus.value,
    notiz: elNotiz.value.trim(),
  };

  try {
    const { error } = await db.from("plantafel").insert([payload]);
    if (error) throw error;

    alert("Gespeichert ✅");
    // Formular nur leeren (KW und Auswahl lassen wir erstmal stehen)
    elTitel.value = "";
    elBaustelle.value = "";
    elMitarbeiter.value = "";
    elNotiz.value = "";

    await loadAndRender();
  } catch (err) {
    console.error(err);
    alert("Fehler beim Speichern ❌");
  }
});

elBtnReload.addEventListener("click", loadAndRender);

elBtnClearForm.addEventListener("click", () => {
  elWeekday.value = "";
  elFahrzeug.value = "";
  elTitel.value = "";
  elBaustelle.value = "";
  elMitarbeiter.value = "";
  elStatus.value = "normal";
  elNotiz.value = "";
});

// Initial
(function init() {
  const current = isoWeekNumber();
  elKwStart.value = String(current);
  elKw.value = String(current);
  loadAndRender();
})();
