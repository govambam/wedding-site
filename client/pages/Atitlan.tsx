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

export default function Atitlan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session.session) {
        navigate("/login");
        return;
      }

      // Get current guest
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .select("*")
        .eq("user_id", session.session.user.id)
        .single();

      if (guestError || !guest) {
        navigate("/login");
        return;
      }

      // Get invite to check Atitlan status
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("id", (guest as Guest).invite_id)
        .single();

      if (inviteError || !inviteData) {
        navigate("/login");
        return;
      }

      const invite = inviteData as Invite;

      // Check if user is invited to Atitlan
      if (!invite.invited_to_atitlan) {
        setAccessDenied(true);
        setTimeout(() => navigate("/wedding", { replace: true }), 100);
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error("Error checking Atitlan access:", err);
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="atitlan-wrapper">
        <div className="atitlan-loading">
          <div className="atitlan-spinner"></div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return null;
  }

  return (
    <div className="atitlan-wrapper">
      <div className="atitlan-container">
        <h1 className="atitlan-title">Lake Atitlan</h1>

        <div className="atitlan-divider"></div>

        <p className="atitlan-intro">
          We're hosting a special post-ceremony celebration at Lake Atitlan
          following the wedding. Join us for a relaxing retreat at one of
          Guatemala's most beautiful destinations.
        </p>

        <div className="atitlan-content">
          <p className="atitlan-paragraph">
            Lake Atitlan is a stunning volcanic lake surrounded by mountains and
            traditional Mayan villages. It's about a 2-3 hour drive from Antigua
            and offers breathtaking views, water activities, and a peaceful
            atmosphere.
          </p>

          <p className="atitlan-paragraph">
            We've arranged accommodations and activities for those who can join
            us. This is a wonderful opportunity to extend your time in Guatemala
            and experience more of what this beautiful country has to offer.
          </p>

          <p className="atitlan-paragraph">
            If you indicated during RSVP that you'll be attending the Lake
            Atitlan celebration, we'll share detailed information about
            transportation, accommodations, and the itinerary closer to the
            wedding date.
          </p>

          <p className="atitlan-placeholder">More details coming soon!</p>
        </div>
      </div>

      <style>{`
        .atitlan-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .atitlan-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .atitlan-spinner {
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

        .atitlan-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .atitlan-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 3rem 0 2rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .atitlan-divider {
          width: 200px;
          height: 1px;
          background-color: #d5d5d5;
          margin: 2rem auto;
        }

        .atitlan-intro {
          font-size: 1.125rem;
          line-height: 1.8;
          color: #333333;
          margin: 2rem auto;
          max-width: 600px;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .atitlan-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .atitlan-paragraph {
          font-size: 1rem;
          line-height: 1.7;
          color: #333333;
          margin: 1.25rem 0;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .atitlan-placeholder {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #999999;
          margin: 2rem 0;
          text-align: center;
          font-family: "orpheuspro", serif;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .atitlan-wrapper {
            padding: 1rem 0.75rem;
          }

          .atitlan-title {
            font-size: 2rem;
            margin: 2rem 0 1.5rem 0;
          }

          .atitlan-divider {
            margin: 1.5rem auto;
          }

          .atitlan-intro {
            font-size: 1rem;
            margin: 1.5rem auto;
          }

          .atitlan-paragraph {
            font-size: 0.95rem;
            margin: 1rem 0;
          }

          .atitlan-placeholder {
            font-size: 0.9rem;
            margin: 1.5rem 0;
          }
        }
      `}</style>
    </div>
  );
}
