// supabase.js
// - Public: Boards lesen ohne Login
// - Editor-Login: E-Mail/Passwort
// - Editor-Check: editors Tabelle

const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.SB = {
  async login(email, password) {
    return window.sb.auth.signInWithPassword({ email, password });
  },
  async logout() {
    return window.sb.auth.signOut();
  },
  async getUser() {
    const { data } = await window.sb.auth.getUser();
    return data?.user || null;
  },
  async isEditor(email) {
    if (!email) return false;
    const { data, error } = await window.sb
      .from("editors")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (error) return false;
    return !!data?.email;
  }
};
