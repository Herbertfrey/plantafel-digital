import supabase from "./supabase.js";

async function fetchTable(table) {
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

async function load() {
  const BAUSTELLEN  = await fetchTable("baustellen");
  const FAHRZEUGE   = await fetchTable("fahrzeuge");
  const MITARBEITER = await fetchTable("mitarbeiter");
  const PLANTAFEL   = await fetchTable("plantafel");

  render(PLANTAFEL);
}

function render(data) {
  const container = document.getElementById("plantafel");
  container.innerHTML = "";

  data.forEach(row => {
    const div = document.createElement("div");
    div.className = "entry";
    div.textContent = `${row.name || row.titel || ""}`;
    container.appendChild(div);
  });
}

document.getElementById("reload").addEventListener("click", load);

load();
