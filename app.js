import { supabase } from "./supabase.js";

// Daten aus einer Tabelle holen
async function getTable(table) {
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

async function load() {
    const BAUSTELLEN = await getTable("baustellen");
    const FAHRZEUGE = await getTable("fahrzeuge");
    const MITARBEITER = await getTable("mitarbeiter");
    const PLANTAFEL = await getTable("plantafel");

    console.log("BAUSTELLEN:", BAUSTELLEN);
    console.log("FAHRZEUGE:", FAHRZEUGE);
    console.log("MITARBEITER:", MITARBEITER);
    console.log("PLANTAFEL:", PLANTAFEL);

    render(BAUSTELLEN, FAHRZEUGE, MITARBEITER, PLANTAFEL);
}

// Einfache Anzeige auf der Webseite
function render(...tables) {
    const output = document.getElementById("dataOutput");
    output.textContent = JSON.stringify(tables, null, 2);
}

load();
document.getElementById("dataOutput").textContent =
  JSON.stringify({
    BAUSTELLEN,
    FAHRZEUGE,
    MITARBEITER,
    PLANTAFEL
  }, null, 2);
