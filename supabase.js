// --- Verbindung zu Supabase ----
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPA_URL = "https://mtybmrkyhavxpvwysglo.supabase.co";
export const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10eWJtcmt5aGF2eHB2d3lzZ2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjQ1OTIsImV4cCI6MjA3Nzc0MDU5Mn0.UToAmJAvACYvnO9hCIeyfm-VYKr5jincXdnEDDtbhvo";

export const supa = createClient(SUPA_URL, SUPA_KEY);
