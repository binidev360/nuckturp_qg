import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente service-role (secret key) que BYPASSA a RLS. Uso server-only
 * (route handlers, jobs). NUNCA importar em código de client. O import
 * "server-only" quebra o build se isto vazar para o bundle do browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
