import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";

interface Guest {
  id: string;
  invite_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  user_id: string | null;
  is_primary: boolean;
}

interface Invite {
  id: string;
  invite_code: string;
  accommodation_group: string;
  invited_to_atitlan: boolean;
  rsvp_status: string;
}

interface UserData {
  currentGuest: Guest;
  invite: Invite;
  allGuests: Guest[];
}

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session fetch error:", sessionError);
        setLoading(false);
        return;
      }

      if (!session.session) {
        // Not logged in, show public landing page
        setLoading(false);
        return;
      }

      // User is logged in, fetch their data
      try {
        const userId = session.session.user.id;

        // Step 1: Get current guest record
        const { data: currentGuest, error: guestError } = await supabase
          .from("guests")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (guestError || !currentGuest) {
          console.error("Guest fetch error:", guestError);
          setLoading(false);
          return;
        }

        // Step 2: Get the invite
        const { data: invite, error: inviteError } = await supabase
          .from("invites")
          .select("*")
          .eq("id", (currentGuest as Guest).invite_id)
          .single();

        if (inviteError || !invite) {
          console.error("Invite fetch error:", inviteError);
          setLoading(false);
          return;
        }

        // Step 3: Get all guests in the invite
        const { data: allGuests, error: allGuestsError } = await supabase
          .from("guests")
          .select("*")
          .eq("invite_id", (currentGuest as Guest).invite_id)
          .order("is_primary", { ascending: false });

        if (allGuestsError || !allGuests) {
          console.error("All guests fetch error:", allGuestsError);
          setLoading(false);
          return;
        }

        const userData: UserData = {
          currentGuest: currentGuest as Guest,
          invite: invite as Invite,
          allGuests: allGuests as Guest[],
        };

        setUserData(userData);
        setIsAuthenticated(true);
        setLoading(false);
      } catch (fetchErr) {
        console.error("Error fetching user data:", fetchErr);
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setLoading(false);
    }
  };

  const getGuestNames = () => {
    if (!userData?.allGuests) return "";
    return userData.allGuests
      .filter((g) => g.first_name)
      .map((g) => g.first_name)
      .join(" & ");
  };

  const getRsvpButtonText = () => {
    if (!userData?.invite) return "RSVP";
    return userData.invite.rsvp_status === "pending" ? "RSVP" : "Update RSVP";
  };

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Show authenticated user's personalized invitation
  if (isAuthenticated && userData) {
    return (
      <div className="invitation-wrapper">
        <div className="invitation-container">
          <div className="invitation-content">
            <h1 className="invitation-couple-primary">Josie Johnson</h1>

            <p className="invitation-separator">and</p>

            <h1 className="invitation-couple-secondary">Ivan Gomez</h1>

            <div className="invitation-divider"></div>

            <p className="invitation-greeting">Dear {getGuestNames()},</p>

            <div className="invitation-body">
              <p className="invitation-paragraph">
                We joyfully invite you to celebrate with us as we exchange our
                vows and begin our journey as husband and wife.
              </p>

              <p className="invitation-paragraph">
                Please join us for our wedding ceremony and reception on
                Thursday, the seventh of January, two thousand twenty-seven, in
                Antigua, Guatemala.
              </p>

              {userData.invite.invited_to_atitlan && (
                <p className="invitation-paragraph">
                  Following the wedding celebrations, we would be honored if you
                  would join us for a special gathering at Lake Atitlan, where
                  we'll continue the festivities in one of Guatemala's most
                  breathtaking settings.
                </p>
              )}

              <p className="invitation-paragraph">
                We have arranged accommodations for our guests. Please visit the{" "}
                <a href="/accommodations" className="invitation-link">
                  accommodations page
                </a>{" "}
                for details about your hotel.
              </p>

              <p className="invitation-closing">With love and anticipation,</p>

              <p className="invitation-signature">Josie & Ivan</p>
            </div>

            <button
              className="invitation-rsvp-button"
              onClick={() => navigate("/rsvp")}
            >
              {getRsvpButtonText()}
            </button>
          </div>
        </div>

        <style>{`
          .invitation-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background-color: #ffffff;
          }

          .invitation-container {
            width: calc(100% - 40px);
            max-width: 1200px;
            background-color: #f8f8f8;
            padding: 60px 80px;
            min-height: calc(100vh - 40px);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }

          .invitation-content {
            width: 100%;
            text-align: center;
          }

          .invitation-couple-primary {
            font-size: 4rem;
            font-weight: 400;
            margin: 0 0 0.5rem 0;
            letter-spacing: 0.02em;
            line-height: 1.1;
            font-family: "orpheuspro", serif;
            color: #000000;
          }

          .invitation-separator {
            font-size: 1.5rem;
            font-style: italic;
            font-weight: 400;
            margin: 0.5rem 0;
            color: #666666;
            letter-spacing: 0.02em;
            font-family: "orpheuspro", serif;
          }

          .invitation-couple-secondary {
            font-size: 4rem;
            font-weight: 400;
            margin: 0.5rem 0 2.5rem 0;
            letter-spacing: 0.02em;
            line-height: 1.1;
            font-family: "orpheuspro", serif;
            color: #000000;
          }

          .invitation-divider {
            width: 200px;
            height: 1px;
            background-color: #333333;
            margin: 2.5rem auto;
          }

          .invitation-greeting {
            font-size: 1.5rem;
            font-weight: 400;
            margin: 2.5rem auto 2rem auto;
            letter-spacing: 0.01em;
            font-family: "orpheuspro", serif;
            color: #000000;
            max-width: 600px;
            text-align: left;
          }

          .invitation-body {
            max-width: 600px;
            margin: 0 auto;
          }

          .invitation-paragraph {
            font-size: 1rem;
            line-height: 1.8;
            color: #333333;
            margin: 1.5rem 0;
            text-align: center;
            font-family: "orpheuspro", serif;
          }

          .invitation-link {
            color: #000000;
            text-decoration: underline;
            transition: opacity 0.2s ease;
          }

          .invitation-link:hover {
            opacity: 0.7;
          }

          .invitation-closing {
            font-size: 1rem;
            line-height: 1.8;
            color: #333333;
            margin: 2rem 0 0.5rem 0;
            text-align: center;
            font-family: "orpheuspro", serif;
          }

          .invitation-signature {
            font-size: 1.25rem;
            font-style: italic;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            text-align: right;
            max-width: 600px;
            margin-left: auto;
            font-family: "orpheuspro", serif;
          }

          .invitation-rsvp-button {
            margin-top: 3rem;
            padding: 0.75rem 2rem;
            background-color: #ffffff;
            color: #000000;
            border: 1px solid #000000;
            font-size: 0.95rem;
            font-family: "orpheuspro", serif;
            cursor: pointer;
            letter-spacing: 0.05em;
            font-weight: 400;
            transition: all 0.2s ease;
          }

          .invitation-rsvp-button:hover {
            background-color: #000000;
            color: #ffffff;
          }

          @media (max-width: 768px) {
            .invitation-wrapper {
              padding: 20px;
            }

            .invitation-container {
              padding: 40px 30px;
              min-height: auto;
            }

            .invitation-couple-primary,
            .invitation-couple-secondary {
              font-size: 2.5rem;
              margin-bottom: 0.25rem;
            }

            .invitation-couple-secondary {
              margin-bottom: 1.5rem;
            }

            .invitation-separator {
              font-size: 1.25rem;
            }

            .invitation-divider {
              margin: 1.5rem auto;
            }

            .invitation-greeting {
              font-size: 1.25rem;
              margin: 1.5rem auto 1.5rem auto;
            }

            .invitation-paragraph {
              font-size: 0.95rem;
              line-height: 1.7;
            }

            .invitation-closing {
              font-size: 0.95rem;
            }

            .invitation-signature {
              font-size: 1.1rem;
            }

            .invitation-rsvp-button {
              margin-top: 2rem;
              padding: 0.65rem 1.5rem;
              font-size: 0.9rem;
            }
          }
        `}</style>
      </div>
    );
  }

  // Show public landing page for non-authenticated users
  return (
    <div className="landing-hero">
      <h1 className="landing-name-primary">Josie Johnson</h1>
      <p className="landing-separator">–and–</p>
      <h1 className="landing-name-secondary">Ivan Gomez</h1>

      <div className="landing-divider"></div>

      <p className="landing-date">January 7, 2027</p>
      <p className="landing-location">Antigua, Guatemala</p>

      <p className="landing-invitation">
        Please log in with your invitation credentials to view wedding details
        and RSVP.
      </p>

      <button onClick={() => navigate("/login")} className="landing-login-button">
        LOG IN
      </button>

      <style>{`
        .landing-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100%;
          padding: 2rem;
          text-align: center;
        }

        .landing-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid #e5e5e5;
          border-top: 2px solid #000000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .landing-name-primary {
          font-size: 4rem;
          font-weight: 400;
          margin: 0 0 0.5rem 0;
          letter-spacing: 0.02em;
          line-height: 1.1;
          font-family: "orpheuspro", serif;
        }

        .landing-separator {
          font-size: 1.5rem;
          font-style: italic;
          font-weight: 400;
          margin: 0.5rem 0;
          color: #666666;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
        }

        .landing-name-secondary {
          font-size: 4rem;
          font-weight: 400;
          margin: 0.5rem 0 2rem 0;
          letter-spacing: 0.02em;
          line-height: 1.1;
          font-family: "orpheuspro", serif;
        }

        .landing-divider {
          width: 60px;
          height: 1px;
          background-color: #000000;
          margin: 2rem auto;
        }

        .landing-date {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0 0 0.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .landing-location {
          font-size: 1.125rem;
          font-weight: 400;
          margin: 0 0 2.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .landing-invitation {
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.8;
          color: #666666;
          margin: 0 0 2.5rem 0;
          letter-spacing: 0.005em;
          max-width: 600px;
          font-family: "orpheuspro", serif;
        }

        .landing-login-button {
          padding: 1rem 3rem;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          letter-spacing: 0.05em;
          font-weight: 400;
          transition: opacity 0.2s ease;
        }

        .landing-login-button:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .landing-name-primary,
          .landing-name-secondary {
            font-size: 2.5rem;
          }

          .landing-date {
            font-size: 1.125rem;
          }

          .landing-location {
            font-size: 1rem;
          }

          .landing-invitation {
            font-size: 0.95rem;
          }

          .landing-login-button {
            padding: 0.75rem 2.5rem;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .landing-name-primary,
          .landing-name-secondary {
            font-size: 2rem;
          }

          .landing-separator {
            font-size: 1.25rem;
          }

          .landing-date {
            font-size: 1rem;
          }

          .landing-location {
            font-size: 0.9rem;
          }

          .landing-invitation {
            font-size: 0.875rem;
            margin-bottom: 2rem;
          }

          .landing-login-button {
            padding: 0.65rem 2rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
