import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hgxwtwdvklcytmtsckpa.supabase.co";
const supabaseKey =
  "sb_publishable_fchN8mDF_R8CectxR9dFtg_vPU~Y~";

export const supabase = createClient(supabaseUrl, supabaseKey);
