import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = "https://mbyrmkyhaxpvvyyslq.supabase.co";
const SUPA_KEY = "sb_publishable_0w8pZSpEAxxlv9Ke6dcurg_OuAl4q7r";

export const supabase = createClient(SUPA_URL, SUPA_KEY);
