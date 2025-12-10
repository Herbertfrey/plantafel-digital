document.getElementById("auftrag-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    kw: Number(document.getElementById("kw").value),
    weekday: document.getElementById("weekday").value,
    titel: document.getElementById("titel").value || null,
    baustelle: document.getElementById("baustelle").value || null,
    mitarbeiter: document.getElementById("mitarbeiter").value || null,
    fahrzeug: document.getElementById("fahrzeug").value || null,
    status: document.getElementById("status").value,
    notiz: document.getElementById("notiz").value || null
  };

  // Pflichtfelder prüfen
  if (!data.kw || !data.weekday) {
    alert("KW und Wochentag müssen gesetzt sein.");
    return;
  }

  try {
    const { error } = await supabase
      .from("plantafel")
      .insert([data]);

    // ✅ NUR hier wird ein Fehler angezeigt
    if (error) {
      console.error("Supabase-Fehler:", error);
      alert("Fehler beim Speichern ❌");
      return;
    }

    // ✅ Erfolgsfall
    alert("Gespeichert ✅");
    e.target.reset();

  } catch (err) {
    console.error("Unerwarteter Fehler:", err);
    alert("Technischer Fehler ❌ (siehe Konsole)");
  }
});
