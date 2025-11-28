import { supabase } from "./supabase.js";

const board = document.getElementById("boardContainer");
const dateStart = document.getElementById("dateStart");

dateStart.valueAsDate = new Date();

document.getElementById("reload").onclick = load;

async function load() {
  board.innerHTML = "<p>Lade…</p>";

  const start = dateStart.value;
  const startDate = new Date(start);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 14);

  const { data, error } = await supabase
    .from("plantafel")
    .select("*")
    .gte("von", startDate.toISOString().substring(0, 10))
    .lte("von", endDate.toISOString().substring(0, 10))
    .order("von", { ascending: true });

  if (error) {
    console.error(error);
    board.innerHTML = "<p>Fehler beim Laden!</p>";
    return;
  }

  render(data);
}

function render(data) {
  board.innerHTML = "";

  let days = {};

  // 14 Tage vorbereiten
  for (let i = 0; i < 14; i++) {
    const d = new Date(dateStart.value);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().substring(0, 10);
    days[key] = [];
  }

  // Einträge sortieren in Tage
  data.forEach(e => {
    if (!days[e.von]) days[e.von] = [];
    days[e.von].push(e);
  });

  // Rendering
  Object.keys(days).forEach(d => {
    const col = document.createElement("div");
    col.className = "day-col";

    col.innerHTML = `<div class="day-title">${d}</div>`;

    days[d].forEach(e => {
      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
        <div class="entry-color"></div>
        <div>
          <div class="entry-title">${e.titel}</div>
          <div class="entry-meta">${e.mitarbeiter || ""}</div>
        </div>
        <button>✏️</button>
        <button>🗑️</button>
      `;

      col.appendChild(div);
    });

    board.appendChild(col);
  });
}

load();
