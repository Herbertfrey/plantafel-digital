import { SUPA_URL, SUPA_KEY } from "./supabase.js";

// kleine Hilfe-Funktion
async function db(table) {
    const url = `${SUPA_URL}/rest/v1/${table}?select=*`;

    const res = await fetch(url, {
        headers: {
            apikey: SUPA_KEY,
            Authorization: `Bearer ${SUPA_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
        }
    });

    if (!res.ok) {
        console.error(table, res.status, await res.text());
        return [];
    }

    return await res.json();
}

// **************************************
//         Daten laden
// **************************************
async function load() {
    const baustellen  = await db("baustellen");
    const fahrzeuge   = await db("fahrzeuge");
    const mitarbeiter = await db("mitarbeiter");
    const plantafel   = await db("plantafel");

    console.log("BAUSTELLEN:", baustellen);
    console.log("FAHRZEUGE:", fahrzeuge);
    console.log("MITARBEITER:", mitarbeiter);
    console.log("PLANTAFEL:", plantafel);

    render(plantafel);
}

// **************************************
//         Render Funktion
// **************************************
function render(data) {
    const container = document.querySelector("#main");
    container.innerHTML = "";

    data.forEach(entry => {
        const box = document.createElement("div");
        box.className = "day";
        box.innerHTML = `
            <strong>${entry.date}</strong><br>
            ${entry.name || ""}<br>
            ${entry.tag || ""}
        `;
        container.appendChild(box);
    });
}

// App starten
window.addEventListener("load", load);
