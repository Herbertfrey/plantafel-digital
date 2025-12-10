const form = document.getElementById("plantafel-form");
const output = document.getElementById("wochenuebersicht");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    kw: Number(document.getElementById("kw").value),
    tag: document.getElementById("weekday").value,
    titel: document.getElementById("titel").value,
    baustelle: document.getElementById("baustelle").value,
    mitarbeiter: document.getElementById("mitarbeiter").value,
    fahrzeug: document.getElementById("fahrzeug").value,
    status: document.getElementById("status").value,
    notiz: document.getElementById("notiz").value,
  };

  const { error } = await window.db
    .from("plantafel")
    .insert([data]);

  if (error) {
    console.error(error);
    alert("Fehler beim Speichern ❌");
    return;
  }

  alert("Gespeichert ✅");
  form.reset();
  ladeDaten();
});

async function ladeDaten() {
  const { data, error } = await window.db
    .from("plantafel")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    output.innerHTML = "<p>Keine Einträge</p>";
    return;
  }

  let html = `
    <table border="1" cellpadding="6">
      <tr>
        <th>Tag</th>
        <th>Titel</th>
        <th>Baustelle</th>
        <th>Mitarbeiter</th>
        <th>Fahrzeug</th>
        <th>Status</th>
      </tr>
  `;

  data.forEach(e => {
    html += `
      <tr>
        <td>${e.tag || ""}</td>
        <td>${e.titel || ""}</td>
        <td>${e.baustelle || ""}</td>
        <td>${e.mitarbeiter || ""}</td>
        <td>${e.fahrzeug || ""}</td>
        <td>${e.status || ""}</td>
      </tr>
    `;
  });

  html += "</table>";
  output.innerHTML = html;
}

ladeDaten();
