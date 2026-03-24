"use client";

import { useState, useTransition } from "react";
import { login, signup, loginWithGoogle } from "@/server/actions/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    setErrorMsg(null);

    startTransition(async () => {
      const action = mode === "login" ? login : signup;
      const result = await action(formData);
      if (result && "error" in result) {
        setErrorMsg(result.error ?? null);
      } else if (result && "message" in result) {
        setMessage(result.message ?? null);
      }
    });
  }

  function handleGoogle() {
    setMessage(null);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await loginWithGoogle();
      if (result && "error" in result) {
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-8 shadow-2xl">
        <h1 className="text-zinc-100 text-lg font-semibold mb-1">
          Gestión de Inversiones
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          {mode === "login" ? "Iniciá sesión en tu cuenta" : "Creá una cuenta nueva"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 text-xs uppercase tracking-wider">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="tu@email.com"
              className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 text-xs uppercase tracking-wider">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded px-3 py-2">
              {errorMsg}
            </p>
          )}

          {message && (
            <p className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800/50 rounded px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            {isPending
              ? "Cargando..."
              : mode === "login"
              ? "Iniciar sesión"
              : "Registrarse"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-500 text-xs">o</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-zinc-900 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </button>

        <p className="text-center text-zinc-500 text-xs mt-5">
          {mode === "login" ? (
            <>
              No tenés cuenta?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                  setMessage(null);
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              Ya tenés cuenta?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setMessage(null);
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Iniciá sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
