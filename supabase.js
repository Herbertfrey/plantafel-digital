/* Supabase REST – zentrale Datenfunktionen */

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dacXIaV9sWHEN0ysSeoFuw_88UaV5tn";

/* Helper: REST-Aufruf */
async function sbFetch(path, { method="GET", body=null, params=null } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));

  const resp = await fetch(url.toString(), {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${method} ${url}: ${resp.status} – ${text}`);
  }

  return await resp.json();
}

/* === Plantafel === */
async function getPlantafelEntries() {
  return sbFetch("plantafel", {
    params: { select: "*", order: "inserted_at.desc", limit: 1000 }
  });
}

async function insertPlantafel(entry) {
  return sbFetch("plantafel", { method: "POST", body: entry });
}

async function updatePlantafel(id, patch) {
  return sbFetch(`plantafel?id=eq.${id}`, { method: "PATCH", body: patch });
}

/* === Mitarbeiter === */
async function getMitarbeiter() {
  return sbFetch("mitarbeiter", { params: { select: "*", order: "name.asc" }});
}

async function saveMitarbeiter(name, color) {
  return sbFetch("mitarbeiter", {
    method: "POST",
    body: { name, color }
  });
}

async function deleteMitarbeiter(name) {
  return sbFetch(`mitarbeiter?name=eq.${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
}

/* === Fahrzeuge === */
async function getFahrzeuge() {
  return sbFetch("fahrzeuge", { params: { select: "*", order: "name.asc" }});
}

async function saveFahrzeug(name, kennzeichen, color) {
  return sbFetch("fahrzeuge", {
    method: "POST",
    body: { name, kennzeichen, color }
  });
}

async function deleteFahrzeug(name) {
  return sbFetch(`fahrzeuge?name=eq.${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
}
