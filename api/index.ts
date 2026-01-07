import serverless from "serverless-http";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "../server/routes/demo";
import { createInvitation } from "../server/routes/invitations";
import { requireAuth, requireAdmin } from "../server/middleware/adminAuth";

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
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

// Export the serverless function
export default serverless(app);
