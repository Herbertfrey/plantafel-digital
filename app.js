import { supabase } from './supabase.js';

// Daten aus einer Tabelle laden
async function loadTable(table) {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Fehler Supabase:", table, error);
        return [];
    }
    return data;
}

// Darstellung bauen
function renderList(title, items) {
    let html = `<h2>${title}</h2>`;

    if (items.length === 0) {
        html += "<div class='empty'>Keine Daten vorhanden</div>";
        return html;
    }

    html += "<ul>";
    for (const row of items) {
        html += `<li>${row.title ?? row.name ?? ''}</li>`;
    }
    html += "</ul>";

    return html;
}

// Hauptfunktion
async function load() {
    let container = document.getElementById("plantafel");
    container.innerHTML = "Lade Daten...";

    const BAU = await loadTable("baustellen");
    const MA  = await loadTable("mitarbeiter");
    const FZG = await loadTable("fahrzeuge");

    container.innerHTML = `
        ${renderList("Baustellen", BAU)}
        ${renderList("Mitarbeiter", MA)}
        ${renderList("Fahrzeuge", FZG)}
    `;
}

document.getElementById("reload").addEventListener("click", load);

load();
