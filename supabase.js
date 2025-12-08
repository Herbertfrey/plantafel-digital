// Supabase-Verbindung + Datenfunktionen

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dacXIaV9sWHEN0ysSeoFuw_88UaV5tn";

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// PLANTAFEL-EINTRÄGE
async function fetchPlantafelEntries() {
  const { data, error } = await supa
    .from("plantafel")
    .select("*")
    .order("von", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function upsertPlantafelEntry(entry, id = null) {
  let resp;
  if (id) {
    resp = await supa.from("plantafel").update(entry).eq("id", id);
  } else {
    resp = await supa.from("plantafel").insert(entry);
  }
  if (resp.error) throw resp.error;
  return resp.data;
}

async function deletePlantafelEntry(id) {
  const { error } = await supa.from("plantafel").delete().eq("id", id);
  if (error) throw error;
}

async function patchPlantafelEntry(id, patch) {
  const { error } = await supa.from("plantafel").update(patch).eq("id", id);
  if (error) throw error;
}

// MITARBEITER
async function fetchMitarbeiter() {
  const { data, error } = await supa
    .from("mitarbeiter")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function upsertMitarbeiter(row, id = null) {
  let resp;
  if (id) {
    resp = await supa.from("mitarbeiter").update(row).eq("id", id);
  } else {
    resp = await supa.from("mitarbeiter").insert(row);
  }
  if (resp.error) throw resp.error;
}

async function deleteMitarbeiterRow(id) {
  const { error } = await supa.from("mitarbeiter").delete().eq("id", id);
  if (error) throw error;
}

// FAHRZEUGE
async function fetchFahrzeuge() {
  const { data, error } = await supa
    .from("fahrzeuge")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function upsertFahrzeug(row, id = null) {
  let resp;
  if (id) {
    resp = await supa.from("fahrzeuge").update(row).eq("id", id);
  } else {
    resp = await supa.from("fahrzeuge").insert(row);
  }
  if (resp.error) throw resp.error;
}

async function deleteFahrzeugRow(id) {
  const { error } = await supa.from("fahrzeuge").delete().eq("id", id);
  if (error) throw error;
}
