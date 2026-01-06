import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/wedding" element={<Wedding />} />
          <Route path="/travel" element={<Travel />} />
          <Route path="/accommodations" element={<Accommodations />} />
          <Route path="/registry" element={<Registry />} />
          <Route path="/atitlan" element={<Atitlan />} />
          <Route path="/rsvp" element={<RSVP />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
