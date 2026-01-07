import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Registry() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="registry-wrapper">
        <div className="registry-loading">
          <div className="registry-spinner"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="registry-wrapper">
      <div className="registry-container">
        <h1 className="registry-title">Registry</h1>

        <div className="registry-content">
          <p className="registry-paragraph">
            Josie and I have been building our home together for many years and
            feel incredibly fortunate to have everything we need. Because of
            this, we kindly request no physical gifts.
          </p>

          <p className="registry-paragraph">
            The greatest gift you could give us is your presence as we celebrate
            in Guatemala—if you're able to join us, that alone means the world.
          </p>

          <p className="registry-paragraph">
            If you'd like to honor our marriage in another way, we will be
            making a donation to Faith in Practice, the medical mission
            organization that first brought us to Guatemala and helped us fall
            in love with this beautiful country. The only gift (beyond your
            presence) we will gladly accept is a contribution to their
            life-changing work.
          </p>

          <div className="registry-donation-section">
            <h2 className="registry-donation-heading">
              Learn More About Faith in Practice
            </h2>

            <div className="registry-donation-boxes">
              <div className="registry-donation-box">
                <p className="registry-donation-box-text">
                  Faith in Practice provides medical mission services and
                  humanitarian aid in Guatemala.
                </p>
                <a
                  href="https://faithinpractice.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="registry-donation-link"
                >
                  Visit Website
                </a>
              </div>

              <div className="registry-donation-box">
                <p className="registry-donation-box-text">
                  Make a contribution to support their life-changing medical
                  mission work.
                </p>
                <a
                  href="https://faithinpractice.org/donate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="registry-donation-link"
                >
                  Donate Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .registry-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .registry-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .registry-spinner {
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

        .registry-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .registry-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 3rem 0 2.5rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .registry-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .registry-paragraph {
          font-size: 1rem;
          line-height: 1.7;
          color: #333333;
          margin: 1.25rem 0;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .registry-donation-section {
          margin-top: 2.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid #e5e5e5;
        }

        .registry-donation-heading {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .registry-donation-boxes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 1.5rem;
        }

        .registry-donation-box {
          padding: 1.5rem;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          text-align: center;
          background-color: #fafafa;
        }

        .registry-donation-box-text {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #333333;
          margin: 0 0 1rem 0;
          font-family: "orpheuspro", serif;
        }

        .registry-donation-link {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background-color: #000000;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          letter-spacing: 0.02em;
          transition: opacity 0.2s ease;
          border-radius: 2px;
        }

        .registry-donation-link:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .registry-wrapper {
            padding: 1rem 0.75rem;
          }

          .registry-title {
            font-size: 2rem;
            margin: 2rem 0 2rem 0;
          }

          .registry-content {
            max-width: 100%;
            padding: 0 0.5rem;
          }

          .registry-paragraph {
            font-size: 0.95rem;
            margin: 1rem 0;
          }

          .registry-donation-section {
            margin-top: 2rem;
            padding-top: 2rem;
          }

          .registry-donation-heading {
            font-size: 1.1rem;
            margin-bottom: 1.5rem;
          }

          .registry-donation-boxes {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-top: 1rem;
          }

          .registry-donation-box {
            padding: 1.25rem;
          }

          .registry-donation-box-text {
            font-size: 0.9rem;
          }

          .registry-donation-link {
            padding: 0.625rem 1.25rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
