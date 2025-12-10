// app.js
// Einfache Wochen-Plantafel: Speichern + Wochenübersicht

// Warten, bis das DOM fertig ist
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auftrag-form");
  if (!form) {
    console.error("Formular mit id='auftrag-form' nicht gefunden.");
    return;
  }

  form.addEventListener("submit", handleSubmit);

  // Beim Laden direkt alle Einträge anzeigen
  loadEntries();
});

/**
 * Formular absenden: Eintrag in Supabase schreiben
 */
async function handleSubmit(event) {
  event.preventDefault();

  const kwInput = document.getElementById("kw");
  const weekdayInput = document.getElementById("weekday");
  const titelInput = document.getElementById("titel");
  const baustelleInput = document.getElementById("baustelle");
  const mitarbeiterInput = document.getElementById("mitarbeiter");
  const fahrzeugInput = document.getElementById("fahrzeug");
  const statusInput = document.getElementById("status");
  const notizInput = document.getElementById("notiz");

  if (
    !kwInput ||
    !weekdayInput ||
    !titelInput ||
    !baustelleInput ||
    !mitarbeiterInput ||
    !fahrzeugInput ||
    !statusInput ||
    !notizInput
  ) {
    alert("Interner Fehler: Formularfelder nicht gefunden.");
    return;
  }

  const kw = parseInt(kwInput.value, 10);
  const weekday = weekdayInput.value;

  if (!kw || !weekday) {
    alert("Bitte KW und Wochentag ausfüllen.");
    return;
  }

  const newEntry = {
    kw,
    weekday,
    titel: titelInput.value.trim(),
    baustelle: baustelleInput.value.trim(),
    mitarbeiter: mitarbeiterInput.value.trim(),
    fahrzeug: fahrzeugInput.value.trim(),
    status: statusInput.value.trim(),
    notiz: notizInput.value.trim(),
    // optionale Felder bleiben NULL
    tag: null,
    von: null,
    bis: null,
    weekend: null,
  };

  try {
    const { data, error } = await supabase
      .from("plantafel")
      .insert([newEntry])
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert-Fehler:", error);
      throw error;
    }

    alert("Gespeichert ✅");
    event.target.reset(); // Formular leeren
    await loadEntries();  // Übersicht neu laden
  } catch (err) {
    console.error("Fehler beim Speichern:", err);
    alert("Fehler beim Speichern ❌");
  }
}

/**
 * Alle Einträge laden und unter „Wochenübersicht“ anzeigen
 */
async function loadEntries() {
  const container = document.getElementById("week-overview");
  if (!container) {
    console.warn("Container mit id='week-overview' nicht gefunden.");
    return;
  }

  container.innerHTML = "<p>Lade Einträge …</p>";

  try {
    const { data, error } = await supabase.from("plantafel").select("*");

    if (error) {
      console.error("Supabase Select-Fehler:", error);
      container.innerHTML = "<p>Fehler beim Laden der Einträge.</p>";
      return;
    }

    if (!data || data.length === 0) {
      container.innerHTML = "<p>Noch keine Einträge gespeichert.</p>";
      return;
    }

    // Sortierung: zuerst nach KW, dann nach Wochentag (Mo–So)
    const weekdayOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    data.sort((a, b) => {
      const kwA = a.kw || 0;
      const kwB = b.kw || 0;
      if (kwA !== kwB) return kwA - kwB;

      const idxA = weekdayOrder.indexOf(a.weekday || "");
      const idxB = weekdayOrder.indexOf(b.weekday || "");
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    // Tabelle aufbauen
    const table = document.createElement("table");
    table.className = "week-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    const headers = [
      "KW",
      "Wochentag",
      "Titel",
      "Baustelle",
      "Mitarbeiter",
      "Fahrzeug",
      "Status",
      "Notiz",
    ];

    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    data.forEach((entry) => {
      const tr = document.createElement("tr");

      addCell(tr, entry.kw ?? "");
      addCell(tr, entry.weekday ?? "");
      addCell(tr, entry.titel ?? "");
      addCell(tr, entry.baustelle ?? "");
      addCell(tr, entry.mitarbeiter ?? "");
      addCell(tr, entry.fahrzeug ?? "");
      addCell(tr, entry.status ?? "");
      addCell(tr, entry.notiz ?? "");

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    container.innerHTML = "";
    container.appendChild(table);
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    container.innerHTML = "<p>Fehler beim Laden der Einträge.</p>";
  }
}

/**
 * Hilfsfunktion: Tabellenzelle hinzufügen
 */
function addCell(tr, text) {
  const td = document.createElement("td");
  td.textContent = text;
  tr.appendChild(td);
}
