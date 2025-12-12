// supabase.js (UMD / global) – KEIN import, KEIN module!

// 1) HIER EINTRAGEN:
const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

// 2) Client erstellen
// supabase ist global, weil index.html vorher das CDN lädt
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
