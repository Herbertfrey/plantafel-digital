// ================================
// Plantafel Dachdeckerei – app.js (FINAL)
// ================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔐 SUPABASE KONFIGURATION
const SUPABASE_URL = "https://yzfmviddzghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
// STATE
// ================================
let currentKW = 50;

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  loadMitarbeiter();
  loadFahrzeuge();
  loadProjekte();
  renderPlantafel();
});

// ================================
// LADEN: STAMMDATEN
// ================================

async function loadMitarbeiter() {
  const { data, error } = await supabase.from("mitarbeiter").select("*");
  if (error) return console.error(error);

  const box = document.getElementById("mitarbeiter-box");
  box.innerHTML = "";

  data.forEach(m => {
    const el = createMagnet(m.name, "mitarbeiter", m.id);
    box.appendChild(el);
  });
}

async function loadFahrzeuge() {
  const { data, error } = await supabase.from("fahrzeuge").select("*");
  if (error) return console.error(error);

  const box = document.getElementById("fahrzeuge-box");
  box.innerHTML = "";

  data.forEach(f => {
    const el = createMagnet(f.name, "fahrzeug", f.id);
    box.appendChild(el);
  });
}

async function loadProjekte() {
  const { data, error } = await supabase.from("projekte").select("*");
  if (error) return console.error(error);

  const box = document.getElementById("projekt-box");
  box.innerHTML = "";

  data.forEach(p => {
    const div = document.createElement("div");
    div.className = "projekt-item";
    div.textContent = p.name;
    box.appendChild(div);
  });
}

// ================================
// MAGNETE
// ================================

function createMagnet(label, typ, id) {
  const el = document.createElement("div");
  el.className = "magnet";
  el.textContent = label;
  el.draggable = true;

  el.dataset.typ = typ; // 🔑 WICHTIG
  el.dataset.id = id;

  el.addEventListener("dragstart", e => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ typ, id, label })
    );
  });

  return el;
}

// ================================
// PLANTAFEL
// ================================

function renderPlantafel() {
  const days = ["Mo", "Di", "Mi", "Do", "Fr"];
  const tafel = document.getElementById("plantafel");
  tafel.innerHTML = "";

  days.forEach(day => {
    const cell = document.createElement("div");
    cell.className = "tag";
    cell.dataset.weekday = day;

    cell.addEventListener("dragover", e => e.preventDefault());
    cell.addEventListener("drop", onDrop);

    cell.innerHTML = `<h4>${day}</h4>`;
    tafel.appendChild(cell);
  });
}

// ================================
// DROP → SPEICHERN
// ================================

async function onDrop(e) {
  e.preventDefault();

  const data = JSON.parse(e.dataTransfer.getData("text/plain"));
  const weekday = e.currentTarget.dataset.weekday;

  const projektId = await getAktivesProjektId();
  if (!projektId) {
    alert("Kein Projekt ausgewählt");
    return;
  }

  const { error } = await supabase.from("einsatzplan").insert({
    projekt_id: projektId,
    kw: currentKW,
    weekday: weekday,
    typ: data.typ,        // 🔴 KRITISCH – FEHLTE VORHER
    item_id: data.id
  });

  if (error) {
    console.error(error);
    alert("Fehler beim Zuweisen");
    return;
  }

  await loadEinsatzplan();
}

// ================================
// EINSATZPLAN LADEN
// ================================

async function loadEinsatzplan() {
  const { data, error } = await supabase
    .from("einsatzplan")
    .select("*, projekte(name)")
    .eq("kw", currentKW);

  if (error) return console.error(error);

  document.querySelectorAll(".tag").forEach(tag => {
    const day = tag.dataset.weekday;
    const entries = data.filter(e => e.weekday === day);

    entries.forEach(e => {
      const div = document.createElement("div");
      div.className = "zuweisung";
      div.textContent = `${e.typ}: ${e.item_id}`;
      tag.appendChild(div);
    });
  });
}

// ================================
// HILFSFUNKTIONEN
// ================================

async function getAktivesProjektId() {
  const input = document.getElementById("projekt-input");
  if (!input || !input.value) return null;

  const { data } = await supabase
    .from("projekte")
    .select("id")
    .eq("name", input.value)
    .single();

  return data?.id ?? null;
}

// ================================
// KW STEUERUNG
// ================================

window.nextKW = () => {
  currentKW++;
  loadEinsatzplan();
};

window.prevKW = () => {
  currentKW--;
  loadEinsatzplan();
};
