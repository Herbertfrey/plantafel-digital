import { supabase } from './supabase.js';

let eintraege = [];
let mitarbeiter = [];
let fahrzeuge = [];
let baustellen = [];


// ======================
// Laden aus DB
// ======================
async function load() {

    let e = await supabase.from('plantafel').select('*').order('tag', { ascending: true });
    let m = await supabase.from('mitarbeiter').select('*');
    let f = await supabase.from('fahrzeuge').select('*');
    let b = await supabase.from('baustellen').select('*');

    eintraege = e.data || [];
    mitarbeiter = m.data || [];
    fahrzeuge = f.data || [];
    baustellen = b.data || [];

    render();
}

// ======================
// Rendern der Einträge
// ======================
function render() {

    const cal = document.getElementById("calendar");
    cal.innerHTML = "";

    eintraege.forEach(e => {

        const div = document.createElement("div");
        div.classList.add("entry");

        div.innerHTML = `
            <b>${e.titel}</b><br>
            ${e.tag}<br>
            ${e.mitarbeiter}<br>
            ${e.fahrzeug}<br>
        `;

        cal.appendChild(div);
    });
}


// ======================
// Event Buttons
// ======================
document.getElementById("reload").addEventListener("click", load);


// Beim Start laden
load();
