import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-dvh flex-col px-6 py-12 sm:px-12 lg:px-20">
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-bold tracking-tight">QG do Mestre</span>
        <form action={signOut}>
          <button
            type="submit"
            className="border-border text-muted-foreground hover:text-foreground h-9 rounded-lg border px-3 text-sm transition-colors"
          >
            Sair
          </button>
        </form>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Bem-vindo, <span className="text-primary">Mestre</span>.
        </h1>
        <p className="text-muted-foreground mt-3">
          Sessão ativa como <span className="font-mono">{user?.email}</span>. O cockpit começa a ser
          montado aqui.
        </p>
      </div>
    </main>
  );
}
