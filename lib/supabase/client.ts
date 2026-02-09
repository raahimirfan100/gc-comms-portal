import { createBrowserClient } from "@supabase/ssr";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Fallback for prerendering / placeholder env values
  return "https://placeholder.supabase.co";
}

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder",
  );
}
