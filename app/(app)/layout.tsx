import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guarda do app autenticado. Authz real é aqui (getUser contata o Auth server),
 * não só no middleware. Sem sessão → /auth. Depois ganha a casca (sidebar/nav).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return <>{children}</>;
}
