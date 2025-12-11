const form = document.getElementById("plantafel-form");

const supa = window.supabase.createClient(
    "https://yzfmviddzhghvcxowbjl.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U"
);

// ⭐ Beim Laden sofort Daten holen
document.addEventListener("DOMContentLoaded", ladeDaten);

// ⭐ Formular absenden
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

    const { error } = await supa.from("plantafel").insert([data]);

    if (error) {
        alert("Fehler beim Speichern ❌");
        console.error(error);
        return;
    }

    alert("Gespeichert ✅");
    form.reset();
    ladeDaten();
});

// ⭐ Daten laden und auf Magnettafel anzeigen
async function ladeDaten() {
    const { data, error } = await supa.from("plantafel").select("*");

    if (error) {
        console.error(error);
        return;
    }

    // Alte Karten löschen
    ["Mo","Di","Mi","Do","Fr"].forEach(tag => {
        document.getElementById("col-" + tag).innerHTML = "";
    });

    // Neue Karten einfügen
    data.forEach(eintrag => {
        const el = document.createElement("div");
        el.className = "card " + (eintrag.status === "wichtig" ? "wichtig" : "");

        el.innerHTML = `
            <h4>${eintrag.titel}</h4>
            <small>${eintrag.baustelle}</small>
            <small>${eintrag.mitarbeiter}</small>
            <small>${eintrag.fahrzeug}</small>
        `;

        document.getElementById("col-" + eintrag.weekday).appendChild(el);
    });
}
