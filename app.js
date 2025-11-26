import { supabase } from './supabase.js';

let eintraege = [];
let mitarbeiter = [];
let fahrzeuge = [];
let baustellen = [];
let aktuellerEintrag = null;


// ===============================
// LADEN AUS DB
// ===============================
async function load() {
    let e = await supabase.from('plantafel').select('*').order('tag', { ascending: true });
    let ma = await supabase.from('mitarbeiter').select('*');
    let fz = await supabase.from('fahrzeuge').select('*');
    let bs = await supabase.from('baustellen').select('*');

    eintraege = e.data || [];
    mitarbeiter = ma.data || [];
    fahrzeuge = fz.data || [];
    baustellen = bs.data || [];

    render();
}

load();


// ===============================
// ANLEGEN / UPDATE / DELETE
// ===============================
async function saveEntry(data) {
    if (aktuellerEintrag) {
        await supabase.from('plantafel').update(data).eq('id', aktuellerEintrag);
    } else {
        await supabase.from('plantafel').insert(data);
    }
    aktuellerEintrag = null;
    document.querySelector('#entryDialog').close();
    load();
}

async function deleteEntry(id) {
    await supabase.from('plantafel').delete().eq('id', id);
    document.querySelector('#entryDialog').close();
    load();
}
window.deleteEntry = deleteEntry;


// ===============================
// UI
// ===============================
function render() {
    const b = document.querySelector('#board');
    b.innerHTML = "";

    eintraege.forEach(e => {
        let div = document.createElement('div');
        div.classList.add("card");

        div.innerHTML = `
            <b>${e.titel}</b><br>
            <span>${e.tag}</span><br>
            <span>${e.mitarbeiter}</span><br>
            <span>${e.fahrzeug}</span><br>

            <button class="edit">✏️</button>
            <button onclick="deleteEntry('${e.id}')">🗑️</button>
        `;

        div.querySelector('.edit').onclick = () => openEntryDialog(e);
        b.appendChild(div);
    });
}


// ===============================
// EINTRAG DIALOG
// ===============================
function openEntryDialog(e = null) {
    aktuellerEintrag = e?.id || null;

    document.querySelector('#titel').value = e?.titel || "";
    document.querySelector('#von').value = e?.tag || "";
    document.querySelector('#bis').value = e?.bis || "";
    document.querySelector('#status').value = e?.status || "normal";
    document.querySelector('#notiz').value = e?.notiz || "";

    document.querySelector('#entryDialog').showModal();
}
window.openEntryDialog = openEntryDialog;


// ===============================
// FORM SPEICHERN
// ===============================
document.querySelector('#entryForm').onsubmit = (ev) => {
    ev.preventDefault();

    saveEntry({
        titel: titel.value,
        tag: von.value,
        bis: bis.value,
        status: status.value,
        notiz: notiz.value,
        mitarbeiter: "",
        fahrzeug: ""
    });
};


document.querySelector('#closeEntryBtn').onclick =
    () => document.querySelector('#entryDialog').close();
document.querySelector('#deleteEntryBtn').onclick =
    () => deleteEntry(aktuellerEintrag);

document.querySelector('#newBtn').onclick = () => openEntryDialog();
