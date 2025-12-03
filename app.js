//
//  Volle, saubere Version der app.js
//  funktioniert mit deiner aktuellen Supabase-Datenbankstruktur
//

import { supabase } from "./supabase.js";


// --------------------------------------------------------
// 1. Allgemeine Ladefunktion für Tabellen
// --------------------------------------------------------
async function loadTable(tableName) {
    const { data, error } = await supabase
        .from(tableName)
        .select(`
            id,
            tag,
            titel,
            mitarbeiter,
            fahrzeug,
            status,
            notiz,
            sort,
            inserted_at,
            baustelle,
            is_detailed,
            von,
            bis
        `)
        .order("tag", { ascending: true });

    if (error) {
        console.error(`❌ Fehler beim Laden der Tabelle ${tableName}:`, error);
        return [];
    }

    return data || [];
}


// --------------------------------------------------------
// 2. Daten im HTML darstellen
// --------------------------------------------------------
function render(plantafel) {
    const div = document.getElementById("plantafel");

    // Wenn keine Einträge vorhanden sind
    if (!plantafel || plantafel.length === 0) {
        div.textContent = "Keine Daten vorhanden.";
        return;
    }

    // Vollständige Ausgaben (vorerst Debug – später baue ich dir die echte Plantafel)
    div.innerHTML = "<pre>" + JSON.stringify(plantafel, null, 2) + "</pre>";
}


// --------------------------------------------------------
// 3. Hauptladefunktion
// --------------------------------------------------------
async function load() {
    document.getElementById("plantafel").textContent = "Lade Daten...";

    // Nur plantafel laden (andere Tabellen kannst du später wieder aktivieren)
    const plantafel = await loadTable("plantafel");

    console.log("📌 PLANTAFEL:", plantafel);

    render(plantafel);
}


// --------------------------------------------------------
// 4. Button Listener
// --------------------------------------------------------
document.getElementById("reload").addEventListener("click", load);


// --------------------------------------------------------
// 5. Beim Laden der Seite starten
// --------------------------------------------------------
load();
