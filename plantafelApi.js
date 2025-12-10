// plantafelApi.js
// Verbindung zu Supabase + CRUD für Tabelle "plantafel"

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.plantafelApi = {
  
  // 🔵 ALLE Einträge laden
  async loadPlantafelEntries() {
    const { data, error } = await supabase
      .from("plantafel")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fehler beim Laden:", error);
      return [];
    }

    return data || [];
  },

  // 🟢 Eintrag speichern (Insert oder Update)
  async savePlantafelEntry(entry) {
    let result;

    if (entry.id) {
      // UPDATE
      const { data, error } = await supabase
        .from("plantafel")
        .update({
          von: entry.von,
          bis: entry.bis,
          kw: entry.kw,
          weekday: entry.weekday,
          titel: entry.titel,
          baustelle: entry.baustelle,
          mitarbeiter: entry.mitarbeiter,
          fahrzeug: entry.fahrzeug,
          status: entry.status,
          notiz: entry.notiz
        })
        .eq("id", entry.id)
        .select()
        .single();

      if (error) {
        console.error("UPDATE-Fehler:", error);
        return null;
      }

      result = data;
    } else {
      // INSERT
      const { data, error } = await supabase
        .from("plantafel")
        .insert([
          {
            von: entry.von,
            bis: entry.bis,
            kw: entry.kw,
            weekday: entry.weekday,
            titel: entry.titel,
            baustelle: entry.baustelle,
            mitarbeiter: entry.mitarbeiter,
            fahrzeug: entry.fahrzeug,
            status: entry.status,
            notiz: entry.notiz
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("INSERT-Fehler:", error);
        return null;
      }

      result = data;
    }

    return result;
  },

  // 🔴 Eintrag löschen
  async deletePlantafelEntry(id) {
    const { error } = await supabase
      .from("plantafel")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE-Fehler:", error);
      return false;
    }
    return true;
  }
};
