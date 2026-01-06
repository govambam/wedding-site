import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";
import Navigation from "@/components/Navigation";

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session fetch error:", sessionError);
        setLoading(false);
        return;
      }

      if (data.session) {
        // User is logged in, fetch their RSVP status
        try {
          const { data: guest, error: guestError } = await supabase
            .from("guests")
            .select(
              `
              *,
              invites!inner(rsvp_status)
            `
            )
            .eq("user_id", data.session.user.id)
            .single();

          if (guestError) {
            console.error("Guest fetch error:", guestError);
            // Redirect to wedding as fallback
            navigate("/wedding", { replace: true });
            return;
          }

          if (guest?.invites?.rsvp_status === "pending") {
            navigate("/rsvp", { replace: true });
          } else {
            navigate("/wedding", { replace: true });
          }
        } catch (fetchErr) {
          console.error("Error fetching guest data:", fetchErr);
          // Fallback to wedding page
          navigate("/wedding", { replace: true });
        }
      } else {
        // Not logged in, show landing page
        setLoading(false);
      }
    } catch (err) {
      console.error("Auth redirect error:", err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="landing-wrapper">
      <Navigation />

      <main className="landing-main">
        <div className="landing-hero">
          <h1 className="landing-name-primary">Josie Johnson</h1>
          <p className="landing-separator">–and–</p>
          <h1 className="landing-name-secondary">Ivan Gomez</h1>

          <div className="landing-divider"></div>

          <p className="landing-date">January 7, 2027</p>
          <p className="landing-location">Antigua, Guatemala</p>

          <p className="landing-invitation">
            Please log in with your invitation credentials to view wedding
            details and RSVP.
          </p>

          <button onClick={() => navigate("/login")} className="landing-login-button">
            LOG IN
          </button>
        </div>
      </main>

      <style>{`
        .landing-wrapper {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #ffffff;
          font-family: "orpheuspro", serif;
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

        .landing-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .landing-hero {
          text-align: center;
          max-width: 600px;
        }

        .landing-name-primary {
          font-size: 4rem;
          font-weight: 400;
          margin: 0 0 0.5rem 0;
          letter-spacing: 0.02em;
          line-height: 1.1;
        }

        .landing-separator {
          font-size: 1.5rem;
          font-style: italic;
          font-weight: 400;
          margin: 0.5rem 0;
          color: #666666;
          letter-spacing: 0.02em;
        }

        .landing-name-secondary {
          font-size: 4rem;
          font-weight: 400;
          margin: 0.5rem 0 2rem 0;
          letter-spacing: 0.02em;
          line-height: 1.1;
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
        }

        .landing-location {
          font-size: 1.125rem;
          font-weight: 400;
          margin: 0 0 2.5rem 0;
          letter-spacing: 0.01em;
        }

        .landing-invitation {
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.8;
          color: #666666;
          margin: 0 0 2.5rem 0;
          letter-spacing: 0.005em;
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
          .landing-main {
            padding: 1.5rem 1rem;
          }

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
