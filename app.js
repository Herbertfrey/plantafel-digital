// Verbindung zu Supabase
const db = supabase.createClient(
    "https://yzfmviddzhghvcxowbjl.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U"
);

const form = document.getElementById("plantafel-form");
const output = document.getElementById("wochenuebersicht");

// ➤ SPEICHERN
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

    const { error } = await db
        .from("plantafel")
        .insert([ data ]);

    if (error) {
        console.error(error);
        alert("Fehler beim Speichern ❌");
        return;
    }

    alert("Gespeichert ✅");
    form.reset();
    ladeDaten();
});

// ➤ DATEN LADEN
async function ladeDaten() {
    const { data, error } = await db
        .from("plantafel")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    output.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${row.weekday || ""}</td>
            <td>${row.titel || ""}</td>
            <td>${row.baustelle || ""}</td>
            <td>${row.mitarbeiter || ""}</td>
            <td>${row.fahrzeug || ""}</td>
            <td>${row.status || ""}</td>
        `;

        output.appendChild(tr);
    });
}

ladeDaten();
