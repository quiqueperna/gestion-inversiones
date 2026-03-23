"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso en Client Components (browser).
 * Instancia única por sesión de navegador.
 *
 * Uso:
 *   const supabase = createClient();
 *   const { data: { session } } = await supabase.auth.getSession();
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
