import { supabase } from "./supabase.js";

// Daten aus Tabelle laden
async function getTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Supabase Fehler:", table, error);
    return [];
  }

  return data;
}

// ---------- Hauptfunktion ----------
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

// Dummy render (dein Code bleibt da)
function render(a,b,c,d){
  console.log("Rendering…");
}

load();
