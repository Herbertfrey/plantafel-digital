import { supabase } from './supabase.js';

let eintraege = [];
let mitarbeiter = [];
let fahrzeuge = [];
let baustellen = [];
let aktuellerEintrag = null;

// ==========================================
// LADEN AUS DB
// ==========================================

async function load() {

  // nur Einträge mit gültiger ID laden!
  let e = await supabase
    .from('plantafel')
    .select('*')
    .not('id', 'is', null)
    .order('tag', { ascending: true });

  let m = await supabase.from('mitarbeiter').select('*');
  let f = await supabase.from('fahrzeuge').select('*');
  let b = await supabase.from('baustellen').select('*');

  eintraege = e.data ?? [];
  mitarbeiter = m.data ?? [];
  fahrzeuge = f.data ?? [];
  baustellen = b.data ?? [];

  render();
}

// ==========================================
// EINTRAG HINZUFÜGEN
// ==========================================

async function insertEntry(rows) {
  return await supabase.from('plantafel').insert(rows);
}

// ==========================================
// UPDATE
// ==========================================

async function updateEntry(id, payload) {
  return await supabase
    .from('plantafel')
    .update(payload)
    .eq('id', id);
}

// ==========================================
// DELETE
// ==========================================

async function deleteEntry(id) {
  await supabase.from('plantafel').delete().eq('id', id);
  await load();
}

// ==========================================
// UI RENDER
// ==========================================

function render() {
  const cont = document.getElementById('entries');
  cont.innerHTML = '';

  eintraege.forEach(e => {

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div><b>${e.titel}</b></div>
      <div>${e.tag}</div>
      <div>${e.mitarbeiter}</div>
      <div>${e.fahrzeug}</div>

      <button class="edit">✏️</button>
      <button class="delete">🗑️</button>
    `;

    // DELETE
    card.querySelector('.delete').onclick = () => {
      deleteEntry(e.id);
    };

    cont.appendChild(card);
  });
}

// ==========================================
// DIALOG ÖFFNEN
// ==========================================

window.openEntryDialog = function () {
  aktuellerEintrag = null;
  document.getElementById('entryDialog').showModal();
};

// ==========================================
// SPEICHERN
// ==========================================

window.saveEntry = async function () {

  const titel = document.getElementById('titel').value;
  const tag = document.getElementById('von').value;

  let payload = {
    titel,
    tag,
    inserted_at: new Date().toISOString()
  };

  if (aktuellerEintrag) {
    await updateEntry(aktuellerEintrag.id, payload);
  } else {
    await insertEntry(payload);
  }

  document.getElementById('entryDialog').close();
  await load();
};

// ==========================================
// START
// ==========================================

load();
