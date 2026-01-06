import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";

export default function Index() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    } catch (err) {
      console.error("Auth check error:", err);
      setIsLoggedIn(false);
    }
  };

  return (
    <div className="home-container">
      <nav className="home-nav">
        {isLoggedIn && (
          <button
            onClick={() => {
              supabase.auth.signOut();
              setIsLoggedIn(false);
            }}
            className="home-nav-logout"
          >
            Sign Out
          </button>
        )}
      </nav>

      <main className="home-main">
        <div className="home-content">
          <h1 className="home-title">Josie & Ivan</h1>
          <div className="home-divider"></div>

          <p className="home-subtitle">
            Celebrating a moment that will change our lives forever
          </p>

          <p className="home-description">
            Join us as we celebrate our love, commitment, and the beginning of
            our new chapter together. We're delighted to have you be part of
            this special occasion.
          </p>

          {!isLoggedIn ? (
            <button
              onClick={() => navigate("/login")}
              className="home-cta-button"
            >
              Login to View Details
            </button>
          ) : (
            <div className="home-logged-in">
              <p className="home-welcome">
                Welcome! Explore additional pages to view event details,
                accommodations, RSVP, and more.
              </p>
              <div className="home-links">
                <a href="#" className="home-link">
                  Event Details
                </a>
                <a href="#" className="home-link">
                  Accommodations
                </a>
                <a href="#" className="home-link">
                  RSVP
                </a>
                <a href="#" className="home-link">
                  Gallery
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="home-footer">
        <p>&copy; 2025 Josie & Ivan. All rights reserved.</p>
      </footer>

      <style>{`
        .home-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #ffffff;
          color: #000000;
          font-family: "orpheuspro", serif;
        }

        .home-nav {
          padding: 2rem;
          display: flex;
          justify-content: flex-end;
          border-bottom: 1px solid #e5e5e5;
        }

        .home-nav-logout {
          padding: 0.5rem 1rem;
          background-color: transparent;
          border: 1px solid #000000;
          color: #000000;
          font-size: 0.875rem;
          cursor: pointer;
          font-family: "orpheuspro", serif;
          transition: opacity 0.2s ease;
        }

        .home-nav-logout:hover {
          opacity: 0.7;
        }

        .home-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
        }

        .home-content {
          text-align: center;
          max-width: 800px;
        }

        .home-title {
          font-size: 4rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.02em;
        }

        .home-divider {
          width: 60px;
          height: 1px;
          background-color: #000000;
          margin: 0 auto 2rem;
        }

        .home-subtitle {
          font-size: 1.5rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.01em;
        }

        .home-description {
          font-size: 1rem;
          line-height: 1.8;
          color: #333333;
          margin: 0 0 3rem 0;
          letter-spacing: 0.005em;
        }

        .home-cta-button {
          padding: 1rem 2.5rem;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          font-size: 1rem;
          cursor: pointer;
          font-family: "orpheuspro", serif;
          letter-spacing: 0.05em;
          font-weight: 400;
          transition: opacity 0.2s ease;
        }

        .home-cta-button:hover {
          opacity: 0.8;
        }

        .home-logged-in {
          margin-top: 2rem;
        }

        .home-welcome {
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0 0 2rem 0;
        }

        .home-links {
          display: flex;
          justify-content: center;
          gap: 3rem;
          flex-wrap: wrap;
        }

        .home-link {
          font-size: 1rem;
          color: #000000;
          text-decoration: none;
          border-bottom: 1px solid #000000;
          padding-bottom: 0.25rem;
          transition: opacity 0.2s ease;
          font-family: "orpheuspro", serif;
        }

        .home-link:hover {
          opacity: 0.7;
        }

        .home-footer {
          padding: 2rem;
          text-align: center;
          border-top: 1px solid #e5e5e5;
          font-size: 0.875rem;
          color: #666666;
        }

        .home-footer p {
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        @media (max-width: 768px) {
          .home-title {
            font-size: 2.5rem;
          }

          .home-subtitle {
            font-size: 1.25rem;
          }

          .home-main {
            padding: 2rem 1.5rem;
          }

          .home-links {
            gap: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .home-title {
            font-size: 2rem;
          }

          .home-subtitle {
            font-size: 1rem;
          }

          .home-description {
            font-size: 0.9rem;
          }

          .home-links {
            flex-direction: column;
            gap: 1rem;
          }

          .home-main {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
