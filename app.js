document.getElementById("auftrag-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // ✅ ZENTRAL, EINMAL, SAUBER
  const data = {
    kw: Number(document.getElementById("kw").value),
    weekday: document.getElementById("weekday").value,
    titel: document.getElementById("titel").value,
    baustelle: document.getElementById("baustelle").value,
    mitarbeiter: document.getElementById("mitarbeiter").value,
    fahrzeug: document.getElementById("fahrzeug").value,
    status: document.getElementById("status").value,
    notiz: document.getElementById("notiz").value
  };

  // ✅ HARTE VALIDIERUNG
  if (!data.kw || !data.weekday) {
    alert("KW und Wochentag müssen gesetzt sein.");
    return;
  }

  try {
    await createEintrag(data);
    alert("Gespeichert ✅");
    e.target.reset();
  } catch {
    alert("Fehler beim Speichern ❌");
  }
});
