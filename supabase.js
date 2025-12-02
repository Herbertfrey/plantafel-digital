import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = "https://mtybmrkyhavxpvwysglo.supabase.co";
const SUPA_KEY = "sb-publishable-mMypmPa3c5h6uUHGdEcura_DuA4fa7";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
