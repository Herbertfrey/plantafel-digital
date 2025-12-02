import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = "https://mtybmrkyhavxpwysglo.supabase.co";
const SUPA_KEY = "dein publichable key";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
