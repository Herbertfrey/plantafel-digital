import { supabase } from "./supabase.js";

const board = document.getElementById("boardContainer");
const dateStart = document.getElementById("dateStart");

// Immer HEUTE
dateStart.valueAsDate = new Date();

async function load() {
  board.innerHTML = "<p>Lade...</p>";

  const { data, error } = await supabase
    .from("plantafel")
    .select("*")
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

  data.forEach(e => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <div class="entry-color" style="background:#005bbb;"></div>
      <div>
        <div class="entry-title">${e.titel}</div>
        <div class="entry-meta">${e.von}</div>
        <div class="entry-meta">${e.mitarbeiter || ""}</div>
      </div>
      <button>✏️</button>
      <button>🗑️</button>
    `;

    board.appendChild(div);
  });
}

document.getElementById("reload").onclick = load;

load();
