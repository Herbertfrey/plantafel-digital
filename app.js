import supabase from "./supabase.js";

// --- Tabelle laden ---
async function loadTable(table) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase Error:", table, error);
    return [];
  }

  return data;
}

// --- Seite laden ---
async function load() {
  const baustellen = await loadTable("baustellen");
  const fahrzeuge = await loadTable("fahrzeuge");
  const mitarbeiter = await loadTable("mitarbeiter");
  const plantafel = await loadTable("plantafel");

  render({ baustellen, fahrzeuge, mitarbeiter, plantafel });
}

// --- Darstellung der 4 Tabellen ---
function render(data) {

  const div = document.getElementById("plantafel");
  div.innerHTML = ""; // vorher löschen

  div.innerHTML += `
    <h2>Baustellen</h2>
    <pre>${JSON.stringify(data.baustellen, null, 2)}</pre>

    <h2>Fahrzeuge</h2>
    <pre>${JSON.stringify(data.fahrzeuge, null, 2)}</pre>

    <h2>Mitarbeiter</h2>
    <pre>${JSON.stringify(data.mitarbeiter, null, 2)}</pre>

    <h2>Plantafel</h2>
    <pre>${JSON.stringify(data.plantafel, null, 2)}</pre>
  `;
}

// --- Button neu laden ---
document.getElementById("reload").addEventListener("click", load);

load();
