import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPA_URL = "https://mtybmrkyhavxpvwysglo.supabase.co";

const SUPA_KEY = "sb-publishable_x0Ejz5pEaxLVWeddscurrQ4uIx47";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
