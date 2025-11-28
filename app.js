// --- Supabase Client ---
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://mtvbmkhyhavxpvwysqlo.supabase.co";
const supabaseKey = "sb_publishable_0w8pZSpEAxxlv9Ke6dcurg_OuAl4q7r"; 

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Elemente ---
const board = document.getElementById("boardContainer");
const datePicker = document.getElementById("startDate");

let start = new Date();
let viewMode = "14";

// --- Buttons ---
document.getElementById("btn14").onclick = () => { viewMode = "14"; load(); };
document.getElementById("btn4W").onclick = () => { viewMode = "28"; load(); };
document.getElementById("btn12M").onclick = () => { viewMode = "365"; load(); };

document.getElementById("btnPrev").onclick = () => {
    start.setDate(start.getDate() - parseInt(viewMode));
    load();
};

document.getElementById("btnNext").onclick = () => {
    start.setDate(start.getDate() + parseInt(viewMode));
    load();
};

document.getElementById("btnReload").onclick = load;

datePicker.value = start.toISOString().substring(0, 10);

// --- Daten laden ---
async function load() {

    const startDate = datePicker.value;
    start = new Date(startDate);

    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(viewMode));

    board.innerHTML = "";

    const { data, error } = await supabase
        .from("plantafel")
        .select("*")
        .gte("von", start.toISOString().substring(0, 10))
        .lte("von", end.toISOString().substring(0, 10))
        .order("von", { ascending: true });

    if (error) {
        console.error("Supabase Fehler:", error);
        board.innerHTML = "<p>Fehler beim Laden ❌ (Supabase Zugriff)</p>";
        return;
    }

    renderCalendar(data);
}

// --- Kalender anzeigen ---
function renderCalendar(data) {

    let dayCount = parseInt(viewMode);
    let d = new Date(start);

    for (let i = 0; i < dayCount; i++) {

        const fieldDate = d.toISOString().substring(0, 10);

        const items = data.filter(e => e.von === fieldDate);

        let title = d.toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

        let html = `<div class="day"><div class="day-header">${title}</div>`;

        items.forEach(e => {

            let farbe = "";
            if (e.status === "urlaub") farbe = "blue";
            if (e.status === "krank") farbe = "red";
            if (e.status === "schule") farbe = "green";
            if (e.status === "fahrzeug") farbe = "orange";

            html += `
                <div class="entry ${farbe}">
                    <strong>${e.titel}</strong><br>
                    ${e.mitarbeiter ?? ""}<br>
                    ${e.fahrzeug ?? ""}<br>
                    ${e.baustelle ?? ""}
                </div>
            `;
        });

        html += "</div>";
        board.innerHTML += html;

        d.setDate(d.getDate() + 1);
    }
}

load();
