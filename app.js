import supabase from "./supabase.js";

// Tabelle laden
async function fetchTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase Fehler:", table, error);
    return [];
  }

  return data;
}

// Ausgabe auf der Seite
function render(data) {
  const container = document.getElementById("plantafel");
  if (!container) return;

  container.innerHTML = ""; // alten Inhalt löschen

  // Ausgabe schöner formatiert
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  container.appendChild(pre);
}

// Hauptfunktion
async function load() {
  const BAUSTELLEN  = await fetchTable("baustellen");
  const FAHRZEUGE   = await fetchTable("fahrzeuge");
  const MITARBEITER = await fetchTable("mitarbeiter");
  const PLANTAFEL   = await fetchTable("plantafel");

  console.log("BAUSTELLEN:", BAUSTELLEN);
  console.log("FAHRZEUGE:", FAHRZEUGE);
  console.log("MITARBEITER:", MITARBEITER);
  console.log("PLANTAFEL:", PLANTAFEL);

  render(PLANTAFEL);
}

// Button neu laden
document.getElementById("reload")
  .addEventListener("click", load);

load();
