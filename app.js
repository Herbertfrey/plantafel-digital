document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("plantafel-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      kw: Number(document.getElementById("kw").value),
      weekday: document.getElementById("weekday").value,
      titel: document.getElementById("titel").value || null,
      baustelle: document.getElementById("baustelle").value || null,
      mitarbeiter: document.getElementById("mitarbeiter").value || null,
      fahrzeug: document.getElementById("fahrzeug").value || null,
      status: document.getElementById("status").value,
      notiz: document.getElementById("notiz").value || null,
    };

    if (!data.kw || !data.weekday) {
      alert("KW und Wochentag fehlen");
      return;
    }

    const { error } = await supabase
      .from("plantafel")
      .insert([data]);

    if (error) {
      console.error(error);
      alert("Fehler beim Speichern ❌");
      return;
    }

    alert("Gespeichert ✅");
    form.reset();
  });
});
