console.log("app.js geladen");

// Formular & Ausgabebereich
const form = document.getElementById("plantafel-form");
const output = document.getElementById("wochenuebersicht");

// Formular speichern
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Daten aus Formular abholen
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

    console.log("Sende Daten:", data);

    // In Supabase speichern
    const { error } = await window.db
        .from("plantafel")
        .insert([data]);

    if (error) {
        console.error(error);
        alert("❌ Fehler beim Speichern");
        return;
    }

    alert("Gespeichert ✅");
    form.reset();
    ladeDaten();
});

// Daten laden & Tabelle anzeigen
async function ladeDaten() {
    const kwValue = Number(document.getElementById("kw").value);
    if (!kwValue) return;

    const { data, error } = await window.db
        .from("plantafel")
        .select("*")
        .eq("kw", kwValue)
        .order("weekday", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log("Geladene Daten:", data);

    output.innerHTML = `
        <table border="1" cellpadding="5">
            <tr>
                <th>Tag</th>
                <th>Titel</th>
                <th>Baustelle</th>
                <th>Mitarbeiter</th>
                <th>Fahrzeug</th>
                <th>Status</th>
            </tr>
            ${data
                .map(
                    (row) => `
                <tr>
                    <td>${row.weekday || ""}</td>
                    <td>${row.titel || ""}</td>
                    <td>${row.baustelle || ""}</td>
                    <td>${row.mitarbeiter || ""}</td>
                    <td>${row.fahrzeug || ""}</td>
                    <td>${row.status || ""}</td>
                </tr>`
                )
                .join("")}
        </table>
    `;
}

// Automatisches Laden, wenn KW geändert wurde
document.getElementById("kw").addEventListener("change", ladeDaten);

// Initial laden (falls KW vorausgefüllt)
ladeDaten();
