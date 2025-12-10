document.getElementById("auftrag-form")
  .addEventListener("submit", async (e) => {

  e.preventDefault();

  const data = {
    kw: Number(document.getElementById("kw").value),
    wochentag: document.getElementById("wochentag").value,
    titel: document.getElementById("titel").value,
    baustelle: document.getElementById("baustelle").value,
    mitarbeiter: document.getElementById("mitarbeiter").value,
    fahrzeug: document.getElementById("fahrzeug").value,
    status: document.getElementById("status").value,
    notiz: document.getElementById("notiz").value
  };

  if (!data.kw || !data.wochentag) {
    alert("KW und Wochentag müssen gesetzt sein");
    return;
  }

  try {
    await createEintrag(data);
    alert("Gespeichert ✅");
    loadWeek(data.kw);
    e.target.reset();
  } catch {
    alert("Fehler beim Speichern ❌");
  }
});
