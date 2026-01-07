import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hgxwtwdvklcytmtsckpa.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_fchh9mpE_R0CecixR9dFtg_vPU-YPY9";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Automatically refresh session when it's about to expire
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect when session is invalid and clear it
    detectSessionInUrl: true,
    // Set flow type to implicit (better for SPA)
    flowType: 'implicit',
  },
});

// Helper to detect and clear stale sessions
export async function validateAndClearStaleSession() {
  try {
    console.log("🔍 Validating session...");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.log("❌ Session error detected, clearing...");
      await supabase.auth.signOut();
      localStorage.clear();
      return false;
    }

    if (!data.session) {
      console.log("✓ No session to validate");
      return false;
    }

    console.log("📋 Found session, attempting to refresh to validate...");

    // Try to refresh the session - this will fail if the refresh token is invalid
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshData.session) {
      console.log("❌ Session refresh failed (session is stale), clearing all storage...");
      console.log("Refresh error:", refreshError?.message);

      // Clear Supabase session
      await supabase.auth.signOut();

      // Clear ALL localStorage to remove stale tokens
      localStorage.clear();

      return false;
    }

    console.log("✓ Session is valid and refreshed");
    return true;
  } catch (err) {
    console.error("❌ Error validating session, clearing all storage:", err);
    await supabase.auth.signOut();
    localStorage.clear();
    return false;
  }
}
