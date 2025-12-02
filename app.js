import { supabase } from "./supabase.js";

// Hilfsfunktion für Tabelle lesen
async function getTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase error:", table, error);
    return [];
  }

  return data;
}

// ====================================
// Daten laden
// ====================================
async function load() {
  const baustellen  = await getTable("baustellen");
  const fahrzeuge   = await getTable("fahrzeuge");
  const mitarbeiter = await getTable("mitarbeiter");
  const plantafel   = await getTable("plantafel");

  console.log("BAUSTELLEN:", baustellen);
  console.log("FAHRZEUGE:", fahrzeuge);
  console.log("MITARBEITER:", mitarbeiter);
  console.log("PLANTAFEL:", plantafel);

  render(plantafel, mitarbeiter, fahrzeuge, baustellen);
}

// ====================================
// Render Funktion bleibt wie vorher
// Du musst hier nichts ändern
// ====================================

function render(plantafel, mitarbeiter, fahrzeuge, baustellen) {
  // << dein Rendering Code >>
}

// ====================================
// Eventlistener Start
// ====================================

load();
