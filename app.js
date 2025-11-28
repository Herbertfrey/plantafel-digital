import { supabase } from './supabase.js';

const board = document.getElementById("boardContainer");
const startInput = document.getElementById("start");
const defaultStartDate = new Date();

async function load() {

    const start = new Date(startInput.value);
    const end = new Date(start);
    end.setDate(start.getDate() + 13);

    const fromDate = start.toISOString().substring(0, 10);
    const toDate = end.toISOString().substring(0, 10);

    const { data, error } = await supabase
        .from('plantafel')
        .select('*')
        .gte('von', fromDate)
        .lte('bis', toDate)
        .order('von', { ascending: true });

    if (error) {
        console.error(error);
        board.innerHTML = "<p>Fehler beim Laden 😢</p>";
        return;
    }

    render(data);
}

function render(data) {
    board.innerHTML = "";

    let days = {};

    // 14 Tage vorbereiten
    const start = new Date(startInput.value);

    for (let i = 0; i < 14; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        const key = date.toISOString().substring(0, 10);
        days[key] = [];
    }

    // Daten pro Tag verteilen (mehrtägige Buchung!)
    for (const item of data) {
        const start = new Date(item.von);
        const end = new Date(item.bis);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = d.toISOString().substring(0, 10);
            if (days[key]) days[key].push(item);
        }
    }

    // Ausgabe erzeugen
    for (const day in days) {
        const div = document.createElement("div");
        div.className = "day";

        // Formatierter Tag
        const d = new Date(day);
        const label = d.toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });

        div.innerHTML = `<h3>${label}</h3>`;

        for (const item of days[day]) {

            const e = document.createElement("div");
            e.className = "entry";

            e.innerHTML = `
                <b>${item.titel}</b><br>
                ${item.baustelle || ""}<br>
                ${item.mitarbeiter || ""}<br>
                ${item.fahrzeug || ""}<br>
                <span>${item.status || ""}</span>
            `;

            div.appendChild(e);
        }

        board.appendChild(div);
    }
}

startInput.value = defaultStartDate.toISOString().substring(0, 10);
load();
startInput.addEventListener("change", load);
