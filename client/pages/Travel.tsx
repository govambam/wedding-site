import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Travel() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="travel-wrapper">
        <div className="travel-loading">
          <div className="travel-spinner"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="travel-wrapper">
      <div className="travel-container">
        <h1 className="travel-title">Travel to Guatemala</h1>

        <div className="travel-section">
          <h2 className="travel-section-heading">Arrival & Transfer</h2>

          <p className="travel-paragraph">
            The easiest way to reach Antigua is to fly into La Aurora
            International Airport (GUA) in Guatemala City. From there, it's
            about a 2-hour scenic drive to Antigua.
          </p>

          <p className="travel-paragraph">
            Our wedding planner can arrange a reliable private transfer service
            for you. A driver will meet you at arrivals (holding a sign with
            your name) and take you directly to your hotel. We'll coordinate
            this once you share your flight details during RSVP.
          </p>

          <p className="travel-paragraph">
            To make things simpler and more fun, we'll ask attending guests to
            share their arrival information with us. That way, we can help
            connect travelers landing around the same time to share transfers if
            desired.
          </p>
        </div>
      </div>

      <style>{`
        .travel-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .travel-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .travel-spinner {
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

        .travel-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .travel-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 3rem 0 0 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .travel-section {
          margin-top: 3rem;
        }

        .travel-section-heading {
          font-size: 1.5rem;
          font-weight: 400;
          margin: 2.5rem 0 2rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .travel-paragraph {
          font-size: 1rem;
          line-height: 1.7;
          color: #333333;
          margin: 1.25rem auto;
          max-width: 600px;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        @media (max-width: 768px) {
          .travel-wrapper {
            padding: 1rem 0.75rem;
          }

          .travel-title {
            font-size: 2rem;
            margin: 2rem 0 0 0;
          }

          .travel-section {
            margin-top: 2rem;
          }

          .travel-section-heading {
            font-size: 1.25rem;
            margin: 2rem 0 1.5rem 0;
          }

          .travel-paragraph {
            font-size: 0.95rem;
            margin: 1rem auto;
          }
        }
      `}</style>
    </div>
  );
}
