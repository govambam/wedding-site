import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/admin/dashboard");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);

    if (!result.success) {
      setError(result.error || "Login failed");
      setLoading(false);
    }
    // Don't set loading to false on success - let the redirect happen
  };

  if (authLoading) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-loading">
          <div className="admin-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-content">
        <div className="admin-login-header">
          <h1 className="admin-login-title">Admin Portal</h1>
          <p className="admin-login-subtitle">Josie & Ivan Wedding</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label htmlFor="email" className="admin-form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-form-input"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="password" className="admin-form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-form-input"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <div className="admin-error-message">{error}</div>}

          <button
            type="submit"
            className="admin-submit-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/" className="admin-back-link">
            ← Back to wedding site
          </a>
        </div>
      </div>

      <style>{`
        .admin-login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #f5f5f5;
          font-family: "orpheuspro", serif;
          padding: 1rem;
        }

        .admin-login-loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid #e5e5e5;
          border-top: 2px solid #000000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .admin-login-content {
          background: white;
          padding: 3rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .admin-login-title {
          font-size: 2rem;
          font-weight: 400;
          margin: 0 0 0.5rem 0;
          color: #000000;
        }

        .admin-login-subtitle {
          font-size: 1rem;
          color: #666666;
          margin: 0;
        }

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .admin-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-form-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: #333333;
        }

        .admin-form-input {
          padding: 0.75rem;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          transition: border-color 0.2s;
        }

        .admin-form-input:focus {
          outline: none;
          border-color: #000000;
        }

        .admin-form-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .admin-error-message {
          padding: 0.75rem;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 4px;
          font-size: 0.9rem;
          text-align: center;
        }

        .admin-submit-button {
          padding: 0.875rem;
          background-color: #000000;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s;
          font-weight: 500;
        }

        .admin-submit-button:hover:not(:disabled) {
          opacity: 0.85;
        }

        .admin-submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .admin-login-footer {
          margin-top: 2rem;
          text-align: center;
        }

        .admin-back-link {
          color: #666666;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .admin-back-link:hover {
          color: #000000;
        }

        @media (max-width: 480px) {
          .admin-login-content {
            padding: 2rem 1.5rem;
          }

          .admin-login-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
