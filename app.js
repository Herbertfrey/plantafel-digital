// app.js – komplette Version

import { supabase } from "./supabase.js";

/**
 * Hilfsfunktion: Loggt Fehler in Konsole.
 */
function logError(context, error) {
  console.error(`Supabase Fehler (${context}):`, error);
}

/**
 * PLANTAFEL LADEN
 * ----------------
 * Holt alle Einträge aus der Tabelle "plantafel".
 * Spalten laut deinem Schema:
 * id, tag, titel, mitarbeiter, fahrzeug, status, notiz,
 * sort, inserted_at, baustelle, is_detailed, von, bis
 */
async function loadPlantafel() {
  const container = document.getElementById("plantafel");
  container.textContent = "Lade Daten…";

  const { data, error } = await supabase
    .from("plantafel")
    .select(
      "id, tag, titel, mitarbeiter, fahrzeug, baustelle, status, notiz, von, bis, sort"
    )
    .order("tag", { ascending: true })
    .order("sort", { ascending: true });

  if (error) {
    logError("plantafel", error);
    container.textContent =
      "Fehler beim Laden der Plantafel. Siehe Konsole.";
    return;
  }

  renderPlantafel(data || []);
}

/**
 * PLANTAFEL RENDERN
 * ------------------
 * Zeigt die Einträge gruppiert nach Datum an.
 */
function renderPlantafel(entries) {
  const container = document.getElementById("plantafel");
  container.innerHTML = "";

  if (!entries || entries.length === 0) {
    container.textContent = "Keine Daten vorhanden.";
    return;
  }

  let currentDate = null;
  let currentGroupDiv = null;

  for (const entry of entries) {
    const dateKey = entry.tag || "ohne Datum";

    if (dateKey !== currentDate) {
      currentDate = dateKey;

      const groupDiv = document.createElement("div");
      groupDiv.className = "day-group";

      const h2 = document.createElement("h2");
      if (entry.tag) {
        const d = new Date(entry.tag);
        h2.textContent = d.toLocaleDateString("de-DE");
      } else {
        h2.textContent = "Ohne Datum";
      }

      groupDiv.appendChild(h2);
      container.appendChild(groupDiv);
      currentGroupDiv = groupDiv;
    }

    const div = document.createElement("div");
    div.className = "plantafel-entry";

    const titel = entry.titel || "(ohne Titel)";
    const mitarb = entry.mitarbeiter || "-";
    const fahrz = entry.fahrzeug || "-";
    const baust = entry.baustelle || "-";
    const status = entry.status || "-";
    const notiz = entry.notiz || "";

    div.innerHTML = `
      <div><strong>Auftrag:</strong> ${titel}</div>
      <div><strong>Baustelle:</strong> ${baust}</div>
      <div><strong>Mitarbeiter:</strong> ${mitarb}</div>
      <div><strong>Fahrzeug:</strong> ${fahrz}</div>
      <div><strong>Status:</strong> ${status}</div>
      ${
        notiz
          ? `<div><strong>Notiz:</strong> ${notiz}</div>`
          : ""
      }
    `;

    currentGroupDiv.appendChild(div);
  }
}

/**
 * STAMMDATEN LADEN
 * ----------------
 * Holt alle Mitarbeiter, Fahrzeuge und Baustellen.
 */
async function loadStammdaten() {
  const [mitarbeiterRes, fahrzeugeRes, baustellenRes] =
    await Promise.all([
      supabase
        .from("mitarbeiter")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("fahrzeuge")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("baustellen")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

  if (mitarbeiterRes.error)
    logError("mitarbeiter", mitarbeiterRes.error);
  if (fahrzeugeRes.error) logError("fahrzeuge", fahrzeugeRes.error);
  if (baustellenRes.error)
    logError("baustellen", baustellenRes.error);

  renderStammdaten(
    mitarbeiterRes.data || [],
    fahrzeugeRes.data || [],
    baustellenRes.data || []
  );
}

/**
 * STAMMDATEN RENDERN
 * -------------------
 */
function renderStammdaten(mitarbeiter, fahrzeuge, baustellen) {
  fillStammdatenList(
    "list-mitarbeiter",
    mitarbeiter,
    "mitarbeiter"
  );
  fillStammdatenList(
    "list-fahrzeuge",
    fahrzeuge,
    "fahrzeuge"
  );
  fillStammdatenList(
    "list-baustellen",
    baustellen,
    "baustellen"
  );
}

/**
 * Hilfsfunktion: Liste für eine Stammdaten-Tabelle füllen.
 */
function fillStammdatenList(elementId, items, tableName) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = "";

  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "(Keine Einträge)";
    ul.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "name";
    nameSpan.textContent = item.name;

    const delBtn = document.createElement("button");
    delBtn.textContent = "X";
    delBtn.title = "Löschen";
    delBtn.addEventListener("click", async () => {
      const ok = confirm(
        `"${item.name}" wirklich aus ${tableName} löschen?`
      );
      if (!ok) return;

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", item.id);

      if (error) {
        logError(`${tableName} löschen`, error);
        alert(
          "Fehler beim Löschen. Siehe Konsole für Details."
        );
        return;
      }

      await loadStammdaten();
    });

    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    ul.appendChild(li);
  }
}

/**
 * NEUE STAMMDATEN ANLEGEN (per prompt)
 * ------------------------------------
 */
async function addStammdatenEintrag(tableName, label) {
  const name = prompt(`${label}-Name eingeben:`);

  if (!name || !name.trim()) {
    return;
  }

  const { error } = await supabase
    .from(tableName)
    .insert({ name: name.trim() });

  if (error) {
    logError(`${tableName} insert`, error);
    alert(
      "Fehler beim Anlegen. Siehe Konsole für Details."
    );
    return;
  }

  await loadStammdaten();
}

/**
 * EVENT-LISTENER EINRICHTEN
 * --------------------------
 */
function setupEventListeners() {
  const reloadBtn = document.getElementById("btn-reload");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      loadPlantafel();
      loadStammdaten();
    });
  }

  const stammdatenToggleBtn =
    document.getElementById("btn-stammdaten-toggle");
  const stammdatenSection = document.getElementById(
    "stammdaten-section"
  );

  if (stammdatenToggleBtn && stammdatenSection) {
    stammdatenToggleBtn.addEventListener("click", () => {
      stammdatenSection.classList.toggle("hidden");
    });
  }

  const addMitarbeiterBtn = document.getElementById(
    "btn-add-mitarbeiter"
  );
  if (addMitarbeiterBtn) {
    addMitarbeiterBtn.addEventListener("click", () =>
      addStammdatenEintrag("mitarbeiter", "Mitarbeiter")
    );
  }

  const addFahrzeugBtn =
    document.getElementById("btn-add-fahrzeug");
  if (addFahrzeugBtn) {
    addFahrzeugBtn.addEventListener("click", () =>
      addStammdatenEintrag("fahrzeuge", "Fahrzeug")
    );
  }

  const addBaustelleBtn =
    document.getElementById("btn-add-baustelle");
  if (addBaustelleBtn) {
    addBaustelleBtn.addEventListener("click", () =>
      addStammdatenEintrag("baustellen", "Baustelle")
    );
  }

  // Platzhalter: später Eintrags-Dialog
  const eintragBtn = document.getElementById("btn-eintrag");
  if (eintragBtn) {
    eintragBtn.addEventListener("click", () => {
      alert(
        "Der Eintrags-Dialog kommt als nächster Schritt. 😉"
      );
    });
  }

  // Start-Datum vorbelegen (heute)
  const startDateInput = document.getElementById("start-date");
  if (startDateInput) {
    const today = new Date();
    startDateInput.value = today
      .toISOString()
      .slice(0, 10);
  }
}

/**
 * INITIALISIERUNG
 * ----------------
 */
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadPlantafel();
  loadStammdaten();
});
