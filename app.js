// app.js – komplett neu, stabil, ohne Nebenabhängigkeiten
// Erwartet: window.supabase aus supabase.js

const form = document.getElementById("plantafel-form");
const overview = document.getElementById("wochenuebersicht") || (() => {
  const d = document.createElement("div");
  d.id = "wochenuebersicht";
  const h = document.createElement("h3");
  h.textContent = "Wochenübersicht";
  d.appendChild(h);
  document.querySelector("main").appendChild(d);
  return d;
})();

function createTable() {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.border = "1";
  const head = document.createElement("tr");
  ["Tag", "Titel", "Baustelle", "Mitarbeiter", "Fahrzeug", "Status"].forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    head.appendChild(th);
  });
  table.appendChild(head);
  return table;
}

async function loadWeek(kw) {
  overview.querySelectorAll("table").forEach(t => t.remove());
  const table = createTable();
  overview.appendChild(table);

  const { data, error } = await window.supabase
    .from("plantafel")
    .select("weekday,titel,baustelle,mitarbeiter,fahrzeug,status")
    .eq("kw", kw)
    .order("weekday");

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(r => {
    const tr = document.createElement("tr");
    [r.weekday, r.titel, r.baustelle, r.mitarbeiter, r.fahrzeug, r.status].forEach(v => {
      const td = document.createElement("td");
      td.textContent = v || "";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const payload = {
    kw: Number(document.getElementById("kw").value),
    weekday: document.getElementById("weekday").value,
    titel: document.getElementById("titel").value,
    baustelle: document.getElementById("baustelle").value,
    mitarbeiter: document.getElementById("mitarbeiter").value,
    fahrzeug: document.getElementById("fahrzeug").value,
    status: document.getElementById("status").value,
    notiz: document.getElementById("notiz").value
  };

  const { error } = await window.supabase.from("plantafel").insert(payload);

  if (error) {
    alert("Fehler beim Speichern");
    console.error(error);
    return;
  }

  alert("Gespeichert ✅");
  loadWeek(payload.kw);
  form.reset();
});

// Initial laden, falls KW eingetragen
const kwInput = document.getElementById("kw");
kwInput.addEventListener("change", () => loadWeek(Number(kwInput.value)));
