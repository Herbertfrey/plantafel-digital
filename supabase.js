import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = "https://mtybmrkyhavxpwysglo.supabase.co";
const SUPA_KEY = "dein public key";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
