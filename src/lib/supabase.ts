import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://omgjbafqukpzdhhpdlaa.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_3bAOHbPjpV5RMnqb-cJKRA_cB1okqvT";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
