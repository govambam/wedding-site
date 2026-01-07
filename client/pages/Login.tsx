import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/utils/supabase";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);

  useEffect(() => {
    console.log("🔄 Login page auth state:", { authLoading, isAuthenticated });
    if (!authLoading && isAuthenticated) {
      console.log("🚀 Navigating to home page...");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔐 Attempting login...");
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("❌ Login error:", signInError);
        setError(signInError.message);
        setLoading(false);
      } else {
        console.log("✅ Login successful!");

        // Give the auth state change listener time to process
        // If it doesn't navigate within 3 seconds, manually navigate
        setTimeout(() => {
          console.log("⏰ Auth timeout, manually navigating...");
          setLoading(false);
          navigate("/");
        }, 3000);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setMagicLinkSent(true);
      }
    } catch (err) {
      setError("Failed to send magic link. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-header">
          <h1 className="login-title">Josie & Ivan</h1>
          <h2 className="login-subtitle">Login</h2>
          <p className="login-instructions">
            Please log in with your invitation credentials to access additional
            pages
          </p>
        </div>

        <div className="login-form-wrapper">
          {magicLinkSent ? (
            <div className="login-success-message">
              <p>Check your email for a login link</p>
            </div>
          ) : (
            <form
              onSubmit={showMagicLink ? handleMagicLink : handleSubmit}
              className="login-form"
            >
              <div className="login-form-group">
                <label htmlFor="email" className="login-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder={
                    showMagicLink
                      ? "your@email.com"
                      : "grandma, friend, cousin, or bestfriend"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  required
                />
              </div>

              {!showMagicLink && (
                <div className="login-form-group">
                  <label htmlFor="password" className="login-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input"
                    required
                  />
                </div>
              )}

              {error && <p className="login-error">{error}</p>}

              <button type="submit" disabled={loading} className="login-button">
                {loading
                  ? showMagicLink
                    ? "Sending..."
                    : "Logging in..."
                  : showMagicLink
                    ? "Send Magic Link"
                    : "SUBMIT"}
              </button>
            </form>
          )}

          {!magicLinkSent && (
            <div className="login-magic-link-section">
              <button
                onClick={() => {
                  setShowMagicLink(!showMagicLink);
                  setError("");
                  setEmail("");
                  setPassword("");
                }}
                className="login-magic-link-button"
              >
                {showMagicLink ? "Back to Login" : "Send Magic Link Instead"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #ffffff;
          padding: 2rem 1rem;
        }

        .login-content {
          width: 100%;
          max-width: 500px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .login-title {
          font-size: 3rem;
          font-weight: 400;
          letter-spacing: 0.02em;
          margin: 0 0 1rem 0;
          font-family: "orpheuspro", serif;
        }

        .login-subtitle {
          font-size: 2rem;
          font-weight: 400;
          margin: 0 0 1.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .login-instructions {
          font-size: 1rem;
          line-height: 1.5;
          color: #000000;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .login-form-wrapper {
          background-color: #ffffff;
          padding: 2rem;
          border: 1px solid #000000;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .login-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .login-label {
          font-size: 1rem;
          font-weight: 400;
          color: #000000;
          font-family: "orpheuspro", serif;
        }

        .login-input {
          padding: 0.75rem;
          border: 1px solid #000000;
          background-color: #ffffff;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .login-input::placeholder {
          color: #999999;
        }

        .login-input:focus {
          outline: none;
          box-shadow: inset 0 0 0 1px #000000;
        }

        .login-button {
          padding: 0.75rem 1.5rem;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          font-size: 1rem;
          font-weight: 400;
          cursor: pointer;
          font-family: "orpheuspro", serif;
          letter-spacing: 0.05em;
          transition: opacity 0.2s ease;
        }

        .login-button:hover:not(:disabled) {
          opacity: 0.8;
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-error {
          color: #dc2626;
          font-size: 0.875rem;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .login-success-message {
          text-align: center;
          padding: 2rem;
          border: 1px solid #000000;
        }

        .login-success-message p {
          font-size: 1rem;
          color: #000000;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .login-magic-link-section {
          text-align: center;
          margin-top: 1.5rem;
        }

        .login-magic-link-button {
          background: none;
          border: none;
          color: #000000;
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0;
          font-family: "orpheuspro", serif;
          transition: opacity 0.2s ease;
        }

        .login-magic-link-button:hover {
          opacity: 0.7;
        }

        @media (max-width: 640px) {
          .login-title {
            font-size: 2rem;
          }

          .login-subtitle {
            font-size: 1.5rem;
          }

          .login-form-wrapper {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
