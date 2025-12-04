import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPA_KEY = "sb_publishable_dacXIaV9sWHEN0ysSeoFuw_88UaV5tn";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
