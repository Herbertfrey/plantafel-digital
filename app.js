import { supabase } from "./supabase.js";

let eintraege = [];
let aktuellerEintrag = null;

async function load() {
    const e = await supabase.from("plantafel").select("*").order("von", { ascending: true });
    eintraege = e.data || [];
    render();
}

function render() {
    const k = document.getElementById("kalender");
    k.innerHTML = "";

    eintraege.forEach(e => {
        const div = document.createElement("div");
        div.className = "entryCard";
        div.dataset.id = e.id;
        div.innerHTML = `
            <strong>${e.titel}</strong><br>
            ${e.von}${e.bis ? (" – " + e.bis) : ""}
        `;
        k.appendChild(div);
    });

    registerClickHandlers();
}

function registerClickHandlers() {
    document.querySelectorAll(".entryCard").forEach(c => {
        c.addEventListener("click", () => {
            openEntryDialog(c.dataset.id);
        });
    });
}

function openEntryDialog(id) {
    aktuellerEintrag = eintraege.find(e => e.id == id);
    document.getElementById("titelInput").value = aktuellerEintrag.titel;
    document.getElementById("vonInput").value = aktuellerEintrag.von;
    document.getElementById("bisInput").value = aktuellerEintrag.bis;

    document.getElementById("entryDialog").showModal();
}

document.getElementById("closeEntry").onclick = () => {
    document.getElementById("entryDialog").close();
};

document.getElementById("addBtn").onclick = () => {
    aktuellerEintrag = null;
    document.getElementById("titelInput").value = "";
    document.getElementById("vonInput").value = "";
    document.getElementById("bisInput").value = "";
    document.getElementById("entryDialog").showModal();
};

load();
