// supabase.js
// Verbindung + einfache Datenfunktionen für plantafel

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_dacXIaV9sWHEN0ysSeoFuw_88UaV5tn";

let supa = null;

(function initSupabase() {
  try {
    if (!window.supabase) {
      console.warn("Supabase-Library (CDN) wurde nicht geladen.");
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Supabase-Konfiguration fehlt.");
      return;
    }
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("Fehler beim Initialisieren von Supabase:", err);
  }
})();

async function loadPlantafelEntries() {
  if (!supa) {
    console.warn("Supabase nicht initialisiert – liefere leere Liste.");
    return [];
  }

  const { data, error } = await supa
    .from("plantafel")
    .select("*")
    .order("von", { ascending: true });

  if (error) {
    console.error("Fehler beim Laden der Plantafel-Einträge:", error);
    alert("Fehler beim Laden der Daten (Supabase). Details in der Konsole.");
    return [];
  }
  return data || [];
}

async function savePlantafelEntry(entry) {
  if (!supa) {
    alert("Supabase nicht verfügbar – Eintrag kann nicht gespeichert werden.");
    return null;
  }

  let resp;
  if (entry.id) {
    // Update
    const { data, error } = await supa
      .from("plantafel")
      .update(entry)
      .eq("id", entry.id)
      .select()
      .single();
    if (error) {
      console.error("Fehler beim Aktualisieren:", error);
      alert("Fehler beim Speichern (Update). Details in der Konsole.");
      return null;
    }
    resp = data;
  } else {
    // Insert
    const { data, error } = await supa
      .from("plantafel")
      .insert(entry)
      .select()
      .single();
    if (error) {
      console.error("Fehler beim Einfügen:", error);
      alert("Fehler beim Speichern (Insert). Details in der Konsole.");
      return null;
    }
    resp = data;
  }
  return resp;
}

async function deletePlantafelEntry(id) {
  if (!supa) {
    alert("Supabase nicht verfügbar – Eintrag kann nicht gelöscht werden.");
    return;
  }
  const { error } = await supa.from("plantafel").delete().eq("id", id);
  if (error) {
    console.error("Fehler beim Löschen:", error);
    alert("Fehler beim Löschen. Details in der Konsole.");
  }
}

// API global verfügbar machen
window.plantafelApi = {
  loadPlantafelEntries,
  savePlantafelEntry,
  deletePlantafelEntry,
};
