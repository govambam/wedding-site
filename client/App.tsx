import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
