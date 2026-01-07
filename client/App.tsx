import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { validateAndClearStaleSession } from "./utils/supabase";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Wedding from "./pages/Wedding";
import Travel from "./pages/Travel";
import Accommodations from "./pages/Accommodations";
import Registry from "./pages/Registry";
import Atitlan from "./pages/Atitlan";
import RSVP from "./pages/RSVP";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AuthDebug from "./pages/AuthDebug";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminGuests from "./pages/admin/AdminGuests";
import AdminRSVP from "./pages/admin/AdminRSVP";
import AdminTravel from "./pages/admin/AdminTravel";
import AdminDietary from "./pages/admin/AdminDietary";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminInvites from "./pages/admin/AdminInvites";
import AdminCreateInvitation from "./pages/admin/AdminCreateInvitation";

const queryClient = new QueryClient();

// Session validator component that runs before app initializes
function AppWithSessionValidation() {
  const [sessionValidated, setSessionValidated] = useState(false);

  useEffect(() => {
    // Validate session on app load
    validateAndClearStaleSession().then(() => {
      setSessionValidated(true);
    });
  }, []);

  // Don't render app until session is validated
  if (!sessionValidated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'orpheuspro, serif'
      }}>
        Loading...
      </div>
    );
  }

  return <App />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
          {/* Public pages with Layout (persistent Navigation) */}
          <Route
            path="/"
            element={
              <Layout>
                <Landing />
              </Layout>
            }
          />

          {/* Login page (no Layout, separate styling) */}
          <Route path="/login" element={<Login />} />

          {/* Debug page */}
          <Route path="/auth-debug" element={<AuthDebug />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/guests"
            element={
              <AdminLayout>
                <AdminGuests />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/rsvp"
            element={
              <AdminLayout>
                <AdminRSVP />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/travel"
            element={
              <AdminLayout>
                <AdminTravel />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/dietary"
            element={
              <AdminLayout>
                <AdminDietary />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <AdminLayout>
                <AdminPayments />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/invites"
            element={
              <AdminLayout>
                <AdminInvites />
              </AdminLayout>
            }
          />
          <Route
            path="/admin/invitations/new"
            element={
              <AdminLayout>
                <AdminCreateInvitation />
              </AdminLayout>
            }
          />

          {/* Authenticated pages with Layout (persistent Navigation) */}
          <Route
            path="/wedding"
            element={
              <Layout>
                <Wedding />
              </Layout>
            }
          />
          <Route
            path="/travel"
            element={
              <Layout>
                <Travel />
              </Layout>
            }
          />
          <Route
            path="/accommodations"
            element={
              <Layout>
                <Accommodations />
              </Layout>
            }
          />
          <Route
            path="/registry"
            element={
              <Layout>
                <Registry />
              </Layout>
            }
          />
          <Route
            path="/atitlan"
            element={
              <Layout>
                <Atitlan />
              </Layout>
            }
          />
          <Route
            path="/rsvp"
            element={
              <Layout>
                <RSVP />
              </Layout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />

          {/* Catch-all */}
          <Route
            path="*"
            element={
              <Layout>
                <NotFound />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<AppWithSessionValidation />);
