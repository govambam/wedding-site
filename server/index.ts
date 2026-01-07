import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createInvitation } from "./routes/invitations";
import { requireAuth, requireAdmin } from "./middleware/adminAuth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Admin routes - protected by authentication and admin check
  app.post(
    "/api/admin/invitations/create",
    requireAuth,
    requireAdmin,
    createInvitation
  );

  return app;
}
