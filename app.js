import { supabase } from "./supabase.js";

// =========================================================================
// Globale Variablen
// =========================================================================
let start = new Date();
const datePicker = document.getElementById("datePicker");

// =========================================================================
// Buttons
// =========================================================================
document.getElementById("next14").onclick = () => { start.setDate(start.getDate() + 14); load(); };
document.getElementById("next30").onclick = () => { start.setDate(start.getDate() + 30); load(); };
document.getElementById("next365").onclick = () => { start.setDate(start.getDate() + 365); load(); };

document.getElementById("prev14").onclick = () => { start.setDate(start.getDate() - 14); load(); };
document.getElementById("prev30").onclick = () => { start.setDate(start.getDate() - 30); load(); };
document.getElementById("prev365").onclick = () => { start.setDate(start.getDate() - 365); load(); };

document.getElementById("btnreload").onclick = load;

datePicker.value = start.toISOString().substring(0, 10);

// =========================================================================
// Daten aus Supabase laden
// =========================================================================
async function load() {
    const startDate = datePicker.value;
    start = new Date(startDate);

    document.getElementById("startOutput").innerText =
        start.toLocaleDateString("de-DE");

    await Promise.all([
        loadPlanTafel(),
        loadMitarbeiter(),
        loadFahrzeuge(),
        loadBaustellen()
    ]);
}

// =========================================================================
// Tabellen laden
// =========================================================================

async function loadPlanTafel() {
    const { data, error } = await supabase
        .from('plantafel')
        .select('*')
        .order('datum', { ascending: true });

    if (error) {
        console.error("Plantafel Fehler:", error);
        return;
    }
    console.log("Plantafel", data);
}

async function loadMitarbeiter() {
    const { data, error } = await supabase
        .from('mitarbeiter')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Mitarbeiter Fehler:", error);
        return;
    }
    console.log("Mitarbeiter", data);
}

async function loadFahrzeuge() {
    const { data, error } = await supabase
        .from('fahrzeuge')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Fahrzeuge Fehler:", error);
        return;
    }
    console.log("Fahrzeuge", data);
}

async function loadBaustellen() {
    const { data, error } = await supabase
        .from('baustellen')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error("Baustellen Fehler:", error);
        return;
    }
    console.log("Baustellen", data);
}

// =========================================================================
// initial laden
// =========================================================================
load();
