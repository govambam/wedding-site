import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hgxwtwdvklcytmtsckpa.supabase.co";
const supabaseKey = "sb_publishable_fchh9mpE_R0CecixR9dFtg_vPU-YPY9";

export const supabase = createClient(supabaseUrl, supabaseKey);
