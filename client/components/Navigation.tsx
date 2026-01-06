import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  email: string;
  invite_id: string;
  is_primary: boolean;
}

interface Invite {
  id: string;
  invited_to_atitlan: boolean;
  rsvp_status: string;
}

interface UserData {
  currentGuest: Guest;
  invite: Invite;
  allGuests: Guest[];
}

export default function Navigation() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        console.log("Auth state changed:", event);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          if (event === "SIGNED_IN") {
            await fetchUserData();
          } else {
            console.log("User signed out");
            setIsLoggedIn(false);
            setUserData(null);
          }
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const checkAuth = async () => {
    try {
      console.log("Checking authentication...");
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session check error:", sessionError);
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      if (data.session) {
        console.log("Session found for user:", data.session.user.id);
        setIsLoggedIn(true);
        await fetchUserData();
      } else {
        console.log("No session found");
        setIsLoggedIn(false);
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.error("Session error:", sessionError);
        setUserData(null);
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;
      console.log("Fetching user data for:", userId);

      // Step 1: Get current user's guest record
      console.log("Step 1: Fetching guest record...");
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .select("*")
        .eq("user_id", userId)
        .single();

      console.log("Guest data:", guest, "Error:", guestError);

      if (guestError) {
        console.error("Guest fetch error:", guestError);
        if (guestError.message.includes("infinite recursion")) {
          console.warn("RLS policy infinite recursion detected. This is a Supabase configuration issue.");
        }
        setUserData(null);
        setLoading(false);
        return;
      }

      if (!guest) {
        console.error("No guest found for user");
        setUserData(null);
        setLoading(false);
        return;
      }

      // Step 2: Get invite
      console.log("Step 2: Fetching invite for invite_id:", guest.invite_id);
      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("id", guest.invite_id)
        .single();

      console.log("Invite data:", invite, "Error:", inviteError);

      if (inviteError) {
        console.error("Invite fetch error:", inviteError);
        if (inviteError.message.includes("infinite recursion")) {
          console.warn("RLS policy infinite recursion on invites table. Check Supabase policies for circular dependencies with admin_users.");
        }
        setUserData(null);
        setLoading(false);
        return;
      }

      if (!invite) {
        console.error("No invite found");
        setUserData(null);
        setLoading(false);
        return;
      }

      // Step 3: Get all guests in invite
      console.log("Step 3: Fetching all guests for invite_id:", guest.invite_id);
      const { data: allGuests, error: allGuestsError } = await supabase
        .from("guests")
        .select("*")
        .eq("invite_id", guest.invite_id)
        .order("is_primary", { ascending: false });

      console.log("All guests:", allGuests, "Error:", allGuestsError);

      if (allGuestsError) {
        console.error("All guests fetch error:", allGuestsError);
        setUserData(null);
        setLoading(false);
        return;
      }

      if (!allGuests || allGuests.length === 0) {
        console.error("No guests found for invite");
        setUserData(null);
        setLoading(false);
        return;
      }

      // Success - store all data
      const userData: UserData = {
        currentGuest: guest as Guest,
        invite: invite as Invite,
        allGuests: allGuests as Guest[],
      };

      console.log("User data loaded successfully:", userData);
      setUserData(userData);
    } catch (error: any) {
      console.error("Unexpected error fetching user data:", error);
      if (error.message?.includes("infinite recursion")) {
        console.warn("⚠️ RLS Policy Issue: Fix the infinite recursion in your Supabase RLS policies");
        console.warn("Check that the 'invites' table policy does not reference 'admin_users'");
      }
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const getGuestDisplayName = () => {
    if (!userData?.allGuests || userData.allGuests.length === 0) {
      return "Guest";
    }

    // Filter guests with first_name (excludes +1s not yet added)
    const namedGuests = userData.allGuests.filter(
      (g) => g.first_name && g.last_name
    );

    console.log("Named guests for display:", namedGuests);

    if (namedGuests.length === 1) {
      const name = `${namedGuests[0].first_name} ${namedGuests[0].last_name}`;
      console.log("Single guest display name:", name);
      return name;
    } else if (namedGuests.length > 1) {
      const name = namedGuests.map((g) => g.first_name).join(" & ");
      console.log("Multiple guests display name:", name);
      return name;
    }

    return "Guest";
  };

  const handleLogout = async () => {
    console.log("Logging out...");
    try {
      // Try to sign out, but don't wait too long
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signout timeout")), 3000)
      );

      await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Error during signout:", error);
      // Continue logout even if signOut fails
    }

    // Always clear local state and redirect
    setIsLoggedIn(false);
    setUserData(null);
    navigate("/", { replace: true });
  };

  const handleRsvpClick = () => {
    setShowDropdown(false);
    navigate("/rsvp");
  };

  const handleDashboardClick = () => {
    setShowDropdown(false);
    navigate("/dashboard");
  };

  console.log("Navigation render:", {
    isLoggedIn,
    loading,
    hasUserData: !!userData,
    rsvpStatus: userData?.invite?.rsvp_status,
  });

  return (
    <nav className="nav-container">
      <div className="nav-content">
        <div className="nav-logo">
          <button onClick={() => navigate("/")} className="nav-logo-button">
            Josie & Ivan
          </button>
        </div>

        {!loading && isLoggedIn && userData && (
          <>
            <div className="nav-links">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/wedding");
                }}
                className="nav-link"
              >
                WEDDING
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/travel");
                }}
                className="nav-link"
              >
                TRAVEL
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/accommodations");
                }}
                className="nav-link"
              >
                ACCOMMODATIONS
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/registry");
                }}
                className="nav-link"
              >
                REGISTRY
              </a>
              {userData.invite?.invited_to_atitlan && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/atitlan");
                  }}
                  className="nav-link"
                >
                  LAKE ATITLAN
                </a>
              )}
            </div>

            <div className="nav-user-menu" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="nav-user-button"
              >
                {getGuestDisplayName()}
                <span className="nav-dropdown-arrow">▼</span>
              </button>

              {showDropdown && (
                <div className="nav-dropdown">
                  {userData.invite?.rsvp_status === "pending" ? (
                    <button
                      onClick={handleRsvpClick}
                      className="nav-dropdown-item"
                    >
                      RSVP
                    </button>
                  ) : (
                    <button
                      onClick={handleRsvpClick}
                      className="nav-dropdown-item"
                    >
                      Update RSVP
                    </button>
                  )}

                  {userData.invite?.rsvp_status === "confirmed" && (
                    <>
                      <div className="nav-dropdown-separator"></div>
                      <button
                        onClick={handleDashboardClick}
                        className="nav-dropdown-item"
                      >
                        Dashboard
                      </button>
                    </>
                  )}

                  <div className="nav-dropdown-separator"></div>
                  <button
                    onClick={handleLogout}
                    className="nav-dropdown-item nav-dropdown-logout"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {!loading && isLoggedIn && !userData && (
          <div className="nav-user-menu" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="nav-user-button"
            >
              Account
              <span className="nav-dropdown-arrow">▼</span>
            </button>

            {showDropdown && (
              <div className="nav-dropdown">
                <button
                  onClick={handleLogout}
                  className="nav-dropdown-item nav-dropdown-logout"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !isLoggedIn && (
          <div className="nav-login">
            <button
              onClick={() => navigate("/login")}
              className="nav-login-button"
            >
              LOGIN
            </button>
          </div>
        )}
      </div>

      <style>{`
        .nav-container {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: #ffffff;
          border-bottom: 1px solid #e5e5e5;
        }

        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: "orpheuspro", serif;
        }

        .nav-logo {
          flex: 0 0 auto;
        }

        .nav-logo-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          font-weight: 400;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          color: #000000;
          padding: 0;
          letter-spacing: 0.01em;
          transition: opacity 0.2s ease;
        }

        .nav-logo-button:hover {
          opacity: 0.7;
        }

        .nav-links {
          display: flex;
          gap: 3rem;
          flex: 1;
          justify-content: center;
          align-items: center;
        }

        .nav-link {
          font-size: 0.875rem;
          color: #000000;
          text-decoration: none;
          font-weight: 400;
          letter-spacing: 0.05em;
          transition: opacity 0.2s ease;
          font-family: "orpheuspro", serif;
          cursor: pointer;
        }

        .nav-link:hover {
          opacity: 0.7;
        }

        .nav-user-menu {
          position: relative;
          flex: 0 0 auto;
        }

        .nav-user-button {
          background: none;
          border: none;
          font-size: 0.875rem;
          font-family: "orpheuspro", serif;
          color: #000000;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: 0.05em;
          font-weight: 400;
          transition: opacity 0.2s ease;
        }

        .nav-user-button:hover {
          opacity: 0.7;
        }

        .nav-dropdown-arrow {
          font-size: 0.625rem;
          display: inline-block;
          transition: transform 0.2s ease;
        }

        .nav-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-top: 0.5rem;
          min-width: 180px;
        }

        .nav-dropdown-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          text-align: left;
          font-size: 0.875rem;
          font-family: "orpheuspro", serif;
          color: #000000;
          cursor: pointer;
          transition: background-color 0.2s ease;
          letter-spacing: 0.05em;
          font-weight: 400;
        }

        .nav-dropdown-item:hover {
          background-color: #f5f5f5;
        }

        .nav-dropdown-logout {
          color: #d32f2f;
        }

        .nav-dropdown-separator {
          height: 1px;
          background-color: #e5e5e5;
          margin: 0;
        }

        .nav-login {
          flex: 0 0 auto;
        }

        .nav-login-button {
          padding: 0.5rem 1rem;
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #000000;
          font-size: 0.875rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s ease;
          letter-spacing: 0.05em;
          font-weight: 400;
        }

        .nav-login-button:hover {
          opacity: 0.7;
        }

        @media (max-width: 1024px) {
          .nav-links {
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .nav-content {
            padding: 1rem 1.5rem;
          }

          .nav-logo-button {
            font-size: 1.25rem;
          }

          .nav-links {
            display: none;
          }

          .nav-user-button {
            font-size: 0.75rem;
          }

          .nav-login-button {
            padding: 0.4rem 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </nav>
  );
}
