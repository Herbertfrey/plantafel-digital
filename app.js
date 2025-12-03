import { supabase } from "./supabase.js";

async function loadPlantafel() {
  const { data, error } = await supabase
    .from("plantafel")
    .select("*")
    .order("datum", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden:", error);
    return [];
  }

  return data;
}

function render(data) {
  const div = document.getElementById("plantafel");
  div.innerHTML = "";

  if (!data.length) {
    div.innerHTML = "<p>Keine Daten vorhanden.</p>";
    return;
  }

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  div.appendChild(pre);
}

async function load() {
  const plantafel = await loadPlantafel();
  console.log("PLANTAFEL:", plantafel);
  render(plantafel);
}

document.getElementById("reload").addEventListener("click", load);

load();
