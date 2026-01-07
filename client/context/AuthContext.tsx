import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, validateAndClearStaleSession } from "@/utils/supabase";

// Type definitions
export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  email: string;
  invite_id: string;
  is_primary: boolean;
}

export interface Invite {
  id: string;
  invite_code?: string;
  invite_type?: string;
  accommodation_group?: string;
  invited_to_atitlan: boolean;
  rsvp_status: string;
  rsvp_submitted_at?: string;
}

export interface UserData {
  currentGuest: Guest;
  invite: Invite;
  allGuests: Guest[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userData: UserData | null;
  error: string | null;
  signOut: () => Promise<void>;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage key for caching
const USER_DATA_CACHE_KEY = "wedding_user_data";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load cached user data from localStorage with session validation
  const loadCachedUserData = async (currentSessionId?: string) => {
    try {
      const cached = localStorage.getItem(USER_DATA_CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);

        // Validate that cache has session ID and timestamp
        if (!parsedCache.sessionId || !parsedCache.timestamp || !parsedCache.data) {
          console.log("Invalid cache format, clearing...");
          localStorage.removeItem(USER_DATA_CACHE_KEY);
          return null;
        }

        // Check if cache is too old (older than 1 hour)
        const cacheAge = Date.now() - parsedCache.timestamp;
        if (cacheAge > 60 * 60 * 1000) {
          console.log("Cache expired (older than 1 hour), clearing...");
          localStorage.removeItem(USER_DATA_CACHE_KEY);
          return null;
        }

        // If we have a session ID, validate it matches
        if (currentSessionId && parsedCache.sessionId !== currentSessionId) {
          console.log("Session ID mismatch, clearing cache...");
          localStorage.removeItem(USER_DATA_CACHE_KEY);
          return null;
        }

        console.log("Loaded valid cached user data from localStorage");
        return parsedCache.data;
      }
    } catch (err) {
      console.error("Error loading cached user data:", err);
      localStorage.removeItem(USER_DATA_CACHE_KEY);
    }
    return null;
  };

  // Save user data to localStorage with session ID and timestamp
  const cacheUserData = async (data: UserData) => {
    try {
      // Get current session to store session ID with cache
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionId = sessionData.session?.user.id;

      if (!sessionId) {
        console.log("No session ID, skipping cache");
        return;
      }

      const cacheData = {
        sessionId,
        timestamp: Date.now(),
        data
      };

      localStorage.setItem(USER_DATA_CACHE_KEY, JSON.stringify(cacheData));
      console.log("Cached user data to localStorage with session validation");
    } catch (err) {
      console.error("Error caching user data:", err);
    }
  };

  // Clear cached user data
  const clearCachedUserData = () => {
    try {
      localStorage.removeItem(USER_DATA_CACHE_KEY);
      console.log("Cleared cached user data from localStorage");
    } catch (err) {
      console.error("Error clearing cached user data:", err);
    }
  };

  // Clear ALL storage including Supabase's session
  const clearAllStorage = async () => {
    try {
      console.log("🗑️ Clearing all storage and signing out...");

      // Sign out from Supabase (this clears Supabase's localStorage keys)
      await supabase.auth.signOut();

      // Clear our custom cache
      clearCachedUserData();

      // Clear any other wedding-related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('wedding'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log("✓ All storage cleared");
    } catch (err) {
      console.error("Error clearing all storage:", err);
      // Even if signOut fails, clear localStorage
      localStorage.clear();
    }
  };

  // Fetch user data (3-step query: guest → invite → allGuests)
  const fetchUserData = useCallback(async (sessionUserId?: string): Promise<UserData | null> => {
    try {
      let userId: string;
      let userEmail: string | undefined;

      if (sessionUserId) {
        // Use provided user ID (from auth state change event)
        userId = sessionUserId;
        console.log("📥 Using provided user ID:", userId);

        // Get email from session
        const { data: sessionData } = await supabase.auth.getSession();
        userEmail = sessionData.session?.user.email;
      } else {
        // Fetch session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          console.error("Session error:", sessionError);
          return null;
        }
        userId = sessionData.session.user.id;
        userEmail = sessionData.session.user.email;
      }

      console.log("📥 Fetching user data for:", userId);

      // Step 1: Get current user's guest record
      console.log("Step 1: Fetching guest record...");
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (guestError) {
        console.error("Guest fetch error:", guestError);
        if (guestError.message.includes("infinite recursion")) {
          console.warn(
            "RLS policy infinite recursion detected. This is a Supabase configuration issue.",
          );
        }
        setError("Failed to load guest data. Please try logging in again.");
        return null;
      }

      if (!guest) {
        console.error("No guest found for user");
        setError("Guest account not found.");
        return null;
      }

      // Step 2: Get invite
      console.log("Step 2: Fetching invite for invite_id:", guest.invite_id);
      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("id", guest.invite_id)
        .single();

      if (inviteError) {
        console.error("Invite fetch error:", inviteError);
        if (inviteError.message.includes("infinite recursion")) {
          console.warn(
            "RLS policy infinite recursion on invites table. Check Supabase policies for circular dependencies.",
          );
        }
        setError("Failed to load invite data. Please try logging in again.");
        return null;
      }

      if (!invite) {
        console.error("No invite found");
        setError("Invite not found.");
        return null;
      }

      // Step 3: Get all guests in invite
      console.log(
        "Step 3: Fetching all guests for invite_id:",
        guest.invite_id,
      );
      const { data: allGuests, error: allGuestsError } = await supabase
        .from("guests")
        .select("*")
        .eq("invite_id", guest.invite_id)
        .order("is_primary", { ascending: false });

      if (allGuestsError) {
        console.error("All guests fetch error:", allGuestsError);
        setError("Failed to load guest list. Please try logging in again.");
        return null;
      }

      if (!allGuests || allGuests.length === 0) {
        console.error("No guests found for invite");
        setError("No guests found for this invite.");
        return null;
      }

      // Success - return all data
      const userData: UserData = {
        currentGuest: guest as Guest,
        invite: invite as Invite,
        allGuests: allGuests as Guest[],
      };

      console.log("User data loaded successfully:", userData);
      return userData;
    } catch (err: any) {
      console.error("Unexpected error fetching user data:", err);
      if (err.message?.includes("infinite recursion")) {
        console.warn(
          "⚠️ RLS Policy Issue: Fix the infinite recursion in your Supabase RLS policies",
        );
      }
      setError("An unexpected error occurred. Please try again.");
      return null;
    }
  }, []);

  // Check authentication and load user data
  const checkAuth = useCallback(async () => {
    try {
      console.log("🔍 Checking authentication...");

      const { data, error: sessionError } = await supabase.auth.getSession();
      console.log("🔐 Session check result:", data.session ? "Session exists" : "No session");

      if (sessionError) {
        console.error("Session check error:", sessionError);
        console.log("🗑️ Session error detected, clearing all storage...");
        await clearAllStorage();
        setIsAuthenticated(false);
        setUserData(null);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        console.log("✅ Session found for user:", data.session.user.id);
        setIsAuthenticated(true);

        // Try to load validated cached data first
        const cachedData = await loadCachedUserData(data.session.user.id);
        if (cachedData) {
          console.log("📦 Using validated cached data");
          setUserData(cachedData);
          setError(null);
        }

        // Fetch fresh user data in background to update cache
        console.log("📥 Fetching fresh user data...");
        try {
          const freshUserData = await fetchUserData();
          console.log("📥 Fresh user data result:", freshUserData ? "Success" : "None (possibly admin user)");

          if (freshUserData) {
            setUserData(freshUserData);
            await cacheUserData(freshUserData);
            setError(null);
          } else {
            // No guest data - could be admin user, which is fine
            console.log("No guest data found - may be admin user");
            if (!cachedData) {
              // Only clear userData if we didn't have valid cache
              setUserData(null);
            }
            setError(null);
          }
        } catch (fetchError: any) {
          console.error("Error fetching user data:", fetchError);

          // If we get auth errors, the session is likely invalid
          if (fetchError.message?.includes('JWT') ||
              fetchError.message?.includes('session') ||
              fetchError.message?.includes('auth')) {
            console.log("🗑️ Invalid session detected, clearing all storage...");
            await clearAllStorage();
            setIsAuthenticated(false);
            setUserData(null);
            setError("Your session has expired. Please log in again.");
          } else {
            // Use cached data if available
            if (!cachedData) {
              setError("Failed to load user data. Please try refreshing.");
            }
          }
        }
      } else {
        console.log("❌ No session found");
        setIsAuthenticated(false);
        setUserData(null);
        clearCachedUserData();
      }
      console.log("✓ Auth check complete. isAuthenticated:", !!data.session);
    } catch (err) {
      console.error("Auth check error:", err);
      await clearAllStorage();
      setIsAuthenticated(false);
      setUserData(null);
      setError("Authentication check failed.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // Refetch user data manually
  const refetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const freshUserData = await fetchUserData();
      if (freshUserData) {
        setUserData(freshUserData);
        await cacheUserData(freshUserData);
        setError(null);
      }
    } catch (err) {
      console.error("Error refetching user data:", err);
      setError("Failed to refresh user data.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // Sign out
  const signOut = useCallback(async () => {
    console.log("Signing out...");
    try {
      // Try to sign out, but don't wait too long
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signout timeout")), 3000),
      );

      await Promise.race([supabase.auth.signOut(), timeoutPromise]);
    } catch (error) {
      console.error("Error during signout:", error);
      // Continue logout even if signOut fails
    }

    // Always clear local state and cache
    setIsAuthenticated(false);
    setUserData(null);
    setError(null);
    clearCachedUserData();
  }, []);

  // Initialize auth check on mount
  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔔 Auth state changed:", event, "Session:", session ? "exists" : "null");

        if (event === "SIGNED_IN") {
          console.log("🔔 Processing SIGNED_IN event...");
          setIsAuthenticated(true);

          if (session?.user?.id) {
            console.log("🔔 Calling fetchUserData from auth listener with user ID:", session.user.id);
            const freshUserData = await fetchUserData(session.user.id);
            console.log("🔔 fetchUserData result:", freshUserData ? "Success" : "None (possibly admin user)");
            if (freshUserData) {
              console.log("🔔 Setting user data and caching...");
              setUserData(freshUserData);
              await cacheUserData(freshUserData);
              setError(null);
              console.log("🔔 SIGNED_IN processing complete!");
            } else {
              console.log("🔔 No guest data (admin user or missing guest record)");
              setUserData(null);
              setError(null);
            }
          } else {
            console.error("🔔 No user ID in session from SIGNED_IN event");
          }
        } else if (event === "SIGNED_OUT") {
          console.log("🔔 User signed out");
          setIsAuthenticated(false);
          setUserData(null);
          setError(null);
          clearCachedUserData();
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkAuth, fetchUserData]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    userData,
    error,
    signOut,
    refetchUserData,
  };

  // Show error UI only if there's a real authentication error (not just missing guest data)
  if (error && !isLoading && !isAuthenticated) {
    return (
      <AuthContext.Provider value={value}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'orpheuspro, serif',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#d32f2f' }}>
            Authentication Error
          </h2>
          <p style={{ fontSize: '1rem', marginBottom: '2rem', color: '#666' }}>
            {error}
          </p>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = '/login';
            }}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: 'orpheuspro, serif'
            }}
          >
            Return to Login
          </button>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
