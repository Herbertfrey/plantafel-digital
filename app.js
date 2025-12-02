import { supabase } from "./supabase.js";

// Tabelle aus Supabase laden
async function loadTable(table) {
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

// Rendern der Daten auf der Seite
function render(data) {
    const div = document.getElementById("plantafel");
    div.innerHTML = ""; // alte Inhalte entfernen

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);
    div.appendChild(pre);
}

// Hauptfunktion
async function load() {
    const baustellen = await loadTable("baustellen");
    const fahrzeuge = await loadTable("fahrzeuge");
    const mitarbeiter = await loadTable("mitarbeiter");
    const plantafel = await loadTable("plantafel");

    console.log("BAUSTELLEN:", baustellen);
    console.log("FAHRZEUGE:", fahrzeuge);
    console.log("MITARBEITER:", mitarbeiter);
    console.log("PLANTAFEL:", plantafel);

    render(plantafel);
}

// Event für Button
document.getElementById("loadBtn").addEventListener("click", load);

// Beim Start direkt laden
load();
