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
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          if (event === "SIGNED_IN") {
            await fetchGuestData();
          } else {
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
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session check error:", sessionError);
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      if (data.session) {
        setIsLoggedIn(true);
        await fetchGuestData();
      } else {
        setIsLoggedIn(false);
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const fetchGuestData = async () => {
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

      // Step 1: Get current user's guest record
      const { data: currentGuest, error: guestError } = await supabase
        .from("guests")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (guestError) throw guestError;
      if (!currentGuest) throw new Error("Guest not found");

      // Step 2: Get the invite for this guest
      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("id", currentGuest.invite_id)
        .single();

      if (inviteError) throw inviteError;

      // Step 3: Get all guests for this invite
      const { data: allGuests, error: allGuestsError } = await supabase
        .from("guests")
        .select("*")
        .eq("invite_id", currentGuest.invite_id)
        .order("is_primary", { ascending: false });

      if (allGuestsError) throw allGuestsError;

      // Store all data for use in navigation
      setUserData({
        currentGuest: currentGuest as Guest,
        invite: invite as Invite,
        allGuests: (allGuests || []) as Guest[],
      });
    } catch (error: any) {
      console.error("Error fetching guest data:", error.message);
      // Show navigation anyway, but without personalized data
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const getGuestDisplayName = () => {
    if (!userData?.allGuests) return "Guest";

    // Filter guests with first_name (excludes +1s not yet added)
    const namedGuests = userData.allGuests.filter(
      (g) => g.first_name && g.last_name
    );

    if (namedGuests.length === 1) {
      return `${namedGuests[0].first_name} ${namedGuests[0].last_name}`;
    } else if (namedGuests.length > 1) {
      return namedGuests.map((g) => g.first_name).join(" & ");
    }

    return "Guest";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserData(null);
    navigate("/");
  };

  const handleRsvpClick = () => {
    setShowDropdown(false);
    navigate("/rsvp");
  };

  const handleDashboardClick = () => {
    setShowDropdown(false);
    navigate("/dashboard");
  };

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

        .nav-dropdown-item:first-child {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
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
