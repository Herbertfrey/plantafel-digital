import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPA_URL = "https://mtbyrmkyhavxpvvysgl0.supabase.co";
const SUPA_KEY = "HIER_DEIN_PUBLISHABLE_KEY";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
