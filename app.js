import { supabase } from "./supabase.js";

const entriesDiv = document.getElementById("entries");
const dateStart = document.getElementById("dateStart");

// Start immer heute
dateStart.valueAsDate = new Date();

async function load() {
    entriesDiv.innerHTML = "Lade...";

    let { data, error } = await supabase
        .from("plantafel")
        .select("*")
        .order("von", { ascending: true });

    if (error) {
        entriesDiv.innerHTML = "Fehler beim Laden 😟";
        console.log(error);
        return;
    }

    show(data);
}

function show(data) {
    entriesDiv.innerHTML = "";

    data.forEach(e => {
        let div = document.createElement("div");
        div.classList.add("entry");
        div.innerHTML = `
          <b>${e.titel}</b><br>
          ${e.von}<br>
          ${e.mitarbeiter}<br>
        `;
        entriesDiv.appendChild(div);
    });
}

document.getElementById("reload").onclick = load;

load();
