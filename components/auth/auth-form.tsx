"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { signIn, signUp, type AuthState } from "@/features/auth/actions";

type Mode = "login" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="w-full max-w-sm">
      <div className="border-border mb-6 flex gap-1 rounded-lg border p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-9 flex-1 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <Input
          type="email"
          name="email"
          placeholder="seu@email.com"
          autoComplete="email"
          required
          aria-label="E-mail"
        />
        <Input
          type="password"
          name="password"
          placeholder="Senha"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          aria-label="Senha"
        />

        {state?.error ? (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground focus-visible:ring-ring mt-1 inline-flex h-12 items-center justify-center rounded-xl px-6 text-base font-semibold tracking-tight transition-[filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Um instante…" : mode === "login" ? "Entrar" : "Criar conta e começar"}
        </button>
      </form>

      {mode === "login" ? (
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link
            href="/redefinir-senha"
            className="hover:text-foreground underline underline-offset-4"
          >
            Esqueci minha senha
          </Link>
        </p>
      ) : (
        <p className="text-muted-foreground mt-4 text-center text-xs">
          21 dias grátis, sem cartão.
        </p>
      )}
    </div>
  );
}
