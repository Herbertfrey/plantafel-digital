// app.js – STABIL & EINFACH

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("plantafel-form");

  if (!form) {
    console.error("Formular plantafel-form nicht gefunden");
    return;
  }

  form.addEventListener("submit", speichern);
});

async function speichern(e) {
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

  if (!data.kw || !data.weekday) {
    alert("KW und Wochentag sind Pflicht");
    return;
  }

  const { error } = await supabase
    .from("plantafel")
    .insert([data]);

  if (error) {
    console.error(error);
    alert("Fehler beim Speichern ❌");
  } else {
    alert("Gespeichert ✅");
    e.target.reset();
  }
}
