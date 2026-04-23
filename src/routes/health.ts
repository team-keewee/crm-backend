import { Router } from "express";
import { pingDB } from "../db/connection.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/ready", async (_req, res) => {
  const ok = await pingDB();
  if (!ok) {
    res.status(503).json({ status: "unavailable" });
    return;
  }
  res.json({ status: "ready" });
});

export { router as healthRouter };
