import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function AuthPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="font-display mb-10 text-lg font-bold tracking-tight">
        QG do <span className="text-primary">Mestre</span>
      </Link>
      <AuthForm />
    </main>
  );
}
