import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase";

interface AccommodationGroup {
  id: string;
  group_code: string;
  display_name: string;
  total_rooms: number | null;
  per_night_cost: number;
  number_of_nights: number;
  payment_options: number[];
  description: string;
}

export default function Accommodations() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accommodationGroup, setAccommodationGroup] =
    useState<AccommodationGroup | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    } else if (!authLoading && isAuthenticated && userData) {
      loadData();
    }
  }, [authLoading, isAuthenticated, userData, navigate]);

  const loadData = async () => {
    try {
      if (!userData) return;

      // Get accommodation group from userData.invite
      if (userData.invite.accommodation_group) {
        const { data: accomGroup, error: accomError } = await supabase
          .from("accommodation_groups")
          .select("*")
          .eq("group_code", userData.invite.accommodation_group)
          .single();

        if (accomError) {
          console.error("Error fetching accommodation group:", accomError);
          setError("Unable to load accommodation information");
          setLoading(false);
          return;
        }

        if (accomGroup) {
          setAccommodationGroup(accomGroup as AccommodationGroup);
        } else {
          setError("Accommodation group not found");
        }
      } else {
        setError("No accommodation assigned");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading accommodations page:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="accommodations-wrapper">
        <div className="accommodations-loading">
          <div className="accommodations-spinner"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="accommodations-wrapper">
        <div className="accommodations-container">
          <div className="accommodations-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              className="accommodations-retry-button"
              onClick={() => {
                setLoading(true);
                loadData();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accommodationGroup) {
    return (
      <div className="accommodations-wrapper">
        <div className="accommodations-container">
          <div className="accommodations-error">
            <h2>Accommodations Not Found</h2>
            <p>Your accommodation information could not be loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="accommodations-wrapper">
      <div className="accommodations-container">
        <h1 className="accommodations-title">Accommodations</h1>

        <h2 className="accommodations-hotel-name">
          {accommodationGroup.display_name}
        </h2>

        <div className="accommodations-divider"></div>

        <p className="accommodations-description">
          {accommodationGroup.description}
        </p>

        {accommodationGroup.total_rooms !== null && (
          <div className="accommodations-info-box">
            <p>
              We've reserved {accommodationGroup.total_rooms} rooms at{" "}
              {accommodationGroup.display_name}. Rooms will be allocated on a
              first-come, first-served basis.
            </p>
          </div>
        )}

        <div className="accommodations-additional-info">
          <p>
            If you'd like to extend your stay with additional nights before or
            after the wedding dates, feel free to contact the hotel directly.
          </p>

          <p>
            Of course, you're always welcome to make your own accommodations
            arrangements if you prefer something different.
          </p>
        </div>
      </div>

      <style>{`
        .accommodations-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .accommodations-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .accommodations-spinner {
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

        .accommodations-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .accommodations-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 0 0 2.5rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .accommodations-hotel-name {
          font-size: 2rem;
          font-weight: 400;
          margin: 2.5rem 0 1.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .accommodations-divider {
          width: 200px;
          height: 1px;
          background-color: #d5d5d5;
          margin: 1.5rem auto;
        }

        .accommodations-description {
          font-size: 1.05rem;
          line-height: 1.7;
          color: #333333;
          margin: 2rem auto;
          max-width: 600px;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .accommodations-info-box {
          margin: 2.5rem auto;
          max-width: 600px;
          padding: 1.5rem;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          text-align: center;
          background-color: #fafafa;
        }

        .accommodations-info-box p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .accommodations-additional-info {
          max-width: 600px;
          margin: 2rem auto;
          padding: 0;
        }

        .accommodations-additional-info p {
          font-size: 0.95rem;
          line-height: 1.7;
          color: #333333;
          margin: 1.5rem 0;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .accommodations-additional-info p:first-child {
          margin-top: 0;
        }

        .accommodations-error {
          text-align: center;
          padding: 3rem 2rem;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          max-width: 600px;
          margin: 0 auto;
        }

        .accommodations-error h2 {
          font-size: 1.5rem;
          font-weight: 400;
          margin: 0 0 1rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .accommodations-error p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #666666;
          margin: 0 0 1.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .accommodations-retry-button {
          padding: 0.75rem 2rem;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s ease;
          letter-spacing: 0.02em;
          font-weight: 400;
        }

        .accommodations-retry-button:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .accommodations-wrapper {
            padding: 1rem 0.75rem;
          }

          .accommodations-title {
            font-size: 2rem;
            margin-bottom: 2rem;
          }

          .accommodations-hotel-name {
            font-size: 1.5rem;
            margin: 2rem 0 1rem 0;
          }

          .accommodations-description {
            font-size: 0.95rem;
            margin: 1.5rem auto;
          }

          .accommodations-info-box {
            margin: 2rem auto;
            padding: 1.25rem;
          }

          .accommodations-info-box p {
            font-size: 0.9rem;
          }

          .accommodations-additional-info {
            margin: 1.5rem auto;
          }

          .accommodations-additional-info p {
            font-size: 0.9rem;
            margin: 1rem 0;
          }

          .accommodations-error {
            padding: 2rem 1.5rem;
          }

          .accommodations-error h2 {
            font-size: 1.25rem;
          }

          .accommodations-error p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
