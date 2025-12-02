import { supabase } from "./supabase.js";

// Lädt beliebige Tabelle
async function loadTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error(`Fehler beim Laden der Tabelle ${table}`, error);
    return [];
  }

  return data;
}

async function load() {
  const baustellen = await loadTable("BAUSTELLEN");
  const fahrzeuge = await loadTable("FAHRZEUGE");
  const mitarbeiter = await loadTable("MITARBEITER");
  const plantafel = await loadTable("PLANTAFEL");

  console.log("Daten geladen:", { baustellen, fahrzeuge, mitarbeiter, plantafel });

  // Ausgabe zur Kontrolle
  const box = document.getElementById("plantafel");
  box.textContent = JSON.stringify(
    { baustellen, fahrzeuge, mitarbeiter, plantafel },
    null,
    2
  );
}

document.getElementById("reload").addEventListener("click", load);

load();
