import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPA_URL = "https://mtybmrkyhavxpvwysglo.supabase.co";
const SUPA_KEY = "HIER-DEIN-ANON-KEY-EINFÜGEN";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
