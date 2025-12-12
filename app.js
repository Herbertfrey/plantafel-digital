const form = document.getElementById("plantafel-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    kw: Number(document.getElementById("kw").value),
    weekday: document.getElementById("weekday").value,
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
  ["Mo","Di","Mi","Do","Fr"].forEach(d => {
    document.getElementById(`col-${d}`).innerHTML = "";
  });

  const { data, error } = await window.db
    .from("plantafel")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(eintrag => {
    const card = document.createElement("div");
    card.className = "card " + eintrag.status;
    card.innerHTML = `
      <strong>${eintrag.titel}</strong><br>
      ${eintrag.baustelle || ""}<br>
      ${eintrag.mitarbeiter || ""}<br>
      ${eintrag.fahrzeug || ""}
    `;

    const col = document.getElementById(`col-${eintrag.weekday}`);
    if (col) col.appendChild(card);
  });
}

ladeDaten();
