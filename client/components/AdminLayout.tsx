import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, adminUser, signOut } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="admin-layout-loading">
        <div className="admin-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/admin/guests", label: "Guests", icon: "👥" },
    { path: "/admin/rsvp", label: "RSVP", icon: "✉️" },
    { path: "/admin/travel", label: "Travel", icon: "✈️" },
    { path: "/admin/dietary", label: "Dietary", icon: "🍽️" },
    { path: "/admin/payments", label: "Payments", icon: "💰" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2 className="admin-sidebar-title">Admin Portal</h2>
          <p className="admin-sidebar-subtitle">Josie & Ivan</p>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? "active" : ""}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-user-email">{adminUser?.email}</div>
            <div className="admin-user-role">{adminUser?.role}</div>
          </div>
          <button onClick={handleSignOut} className="admin-logout-button">
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f5f5f5;
          font-family: "orpheuspro", serif;
        }

        .admin-layout-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
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

        .admin-sidebar {
          width: 260px;
          background-color: #ffffff;
          border-right: 1px solid #e5e5e5;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          overflow-y: auto;
        }

        .admin-sidebar-header {
          padding: 2rem 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .admin-sidebar-title {
          font-size: 1.5rem;
          font-weight: 400;
          margin: 0 0 0.25rem 0;
          color: #000000;
        }

        .admin-sidebar-subtitle {
          font-size: 0.9rem;
          color: #666666;
          margin: 0;
        }

        .admin-nav {
          flex: 1;
          padding: 1rem 0;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.5rem;
          color: #333333;
          text-decoration: none;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .admin-nav-item:hover {
          background-color: #f5f5f5;
          color: #000000;
        }

        .admin-nav-item.active {
          background-color: #f5f5f5;
          color: #000000;
          border-left-color: #000000;
          font-weight: 500;
        }

        .admin-nav-icon {
          font-size: 1.25rem;
        }

        .admin-nav-label {
          font-size: 1rem;
        }

        .admin-sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e5e5;
        }

        .admin-user-info {
          margin-bottom: 1rem;
        }

        .admin-user-email {
          font-size: 0.85rem;
          color: #333333;
          margin-bottom: 0.25rem;
          word-break: break-word;
        }

        .admin-user-role {
          font-size: 0.75rem;
          color: #666666;
          text-transform: capitalize;
        }

        .admin-logout-button {
          width: 100%;
          padding: 0.625rem;
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .admin-logout-button:hover {
          background-color: #000000;
          color: #ffffff;
          border-color: #000000;
        }

        .admin-main {
          flex: 1;
          margin-left: 260px;
          overflow-y: auto;
        }

        .admin-content {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            width: 100%;
            height: auto;
            position: relative;
          }

          .admin-main {
            margin-left: 0;
          }

          .admin-content {
            padding: 1rem;
          }

          .admin-nav {
            flex: 0;
          }
        }
      `}</style>
    </div>
  );
}
