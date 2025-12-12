// supabase.js (UMD / global) – KEIN import, KEIN module!

// 1) HIER EINTRAGEN:
const SUPABASE_URL = "HIER_DEINE_SUPABASE_URL_EINTRAGEN";
const SUPABASE_ANON_KEY = "HIER_DEIN_ANON_KEY_EINTRAGEN";

// 2) Client erstellen
// supabase ist global, weil index.html vorher das CDN lädt
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
