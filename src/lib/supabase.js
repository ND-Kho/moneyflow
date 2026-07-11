import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Thiếu biến môi trường Supabase. Hãy kiểm tra file .env.local."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
