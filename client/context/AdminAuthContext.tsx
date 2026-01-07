import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase";

// Type definitions
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'wedding_planner';
  created_at: string;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  adminUser: AdminUser | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch admin user from admin_users table
  const fetchAdminUser = useCallback(async (email: string): Promise<AdminUser | null> => {
    try {
      console.log("🔍 Checking if user is admin:", email);

      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from("admin_users")
        .select("*")
        .eq("email", email)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout - database may have RLS policy issues")), 10000)
      );

      const { data, error: queryError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (queryError) {
        console.error("❌ Admin user query error:", queryError);
        return null;
      }

      if (!data) {
        console.log("❌ User is not an admin");
        return null;
      }

      console.log("✅ Admin user found:", data);
      return data as AdminUser;
    } catch (err) {
      console.error("❌ Error fetching admin user:", err);
      return null;
    }
  }, []);

  // Check authentication on mount
  const checkAuth = useCallback(async () => {
    try {
      console.log("🔍 Checking admin authentication...");

      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        console.log("✅ Session found, checking admin status...");
        const admin = await fetchAdminUser(data.session.user.email!);

        if (admin) {
          setIsAuthenticated(true);
          setAdminUser(admin);
        } else {
          setIsAuthenticated(false);
          setAdminUser(null);
          setError("This account does not have admin access.");
        }
      } else {
        console.log("❌ No session found");
        setIsAuthenticated(false);
        setAdminUser(null);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setIsAuthenticated(false);
      setAdminUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAdminUser]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("🔐 Attempting admin login:", email);

      // First check if user is in admin_users table
      const admin = await fetchAdminUser(email);
      if (!admin) {
        return { success: false, error: "This account does not have admin access." };
      }

      // Attempt sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("❌ Sign in error:", signInError);
        return { success: false, error: signInError.message };
      }

      console.log("✅ Sign in successful");
      setIsAuthenticated(true);
      setAdminUser(admin);
      setError(null);

      return { success: true };
    } catch (err: any) {
      console.error("❌ Sign in error:", err);
      return { success: false, error: err.message || "An unexpected error occurred" };
    }
  }, [fetchAdminUser]);

  // Sign out
  const signOut = useCallback(async () => {
    console.log("🚪 Signing out admin...");
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during signout:", error);
    }

    setIsAuthenticated(false);
    setAdminUser(null);
    setError(null);
  }, []);

  // Initialize auth check
  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔔 Admin auth state changed:", event);

        if (event === "SIGNED_IN" && session?.user?.email) {
          // Only check admin status if we don't already have it
          // This prevents unnecessary queries and timeouts
          if (!adminUser || adminUser.email !== session.user.email) {
            const admin = await fetchAdminUser(session.user.email);
            if (admin) {
              setIsAuthenticated(true);
              setAdminUser(admin);
              setError(null);
            } else {
              // Only set unauthenticated if this is a definitive "not an admin" response
              // Don't clear auth on timeout/error - user might already be authenticated
              if (isAuthenticated && adminUser) {
                console.log("⚠️ Admin check failed but keeping existing authentication");
              } else {
                setIsAuthenticated(false);
                setAdminUser(null);
                setError("This account does not have admin access.");
              }
            }
          } else {
            console.log("✓ Admin user already cached, skipping check");
          }
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setAdminUser(null);
          setError(null);
        } else if (event === "INITIAL_SESSION" && session?.user?.email) {
          // On initial session, try to load admin user
          if (!adminUser) {
            const admin = await fetchAdminUser(session.user.email);
            if (admin) {
              setIsAuthenticated(true);
              setAdminUser(admin);
              setError(null);
            }
          }
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkAuth, fetchAdminUser, adminUser, isAuthenticated]);

  const value: AdminAuthContextType = {
    isAuthenticated,
    isLoading,
    adminUser,
    error,
    signIn,
    signOut,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

// Custom hook to use admin auth context
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
