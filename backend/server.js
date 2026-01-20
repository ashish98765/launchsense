// LaunchSense Backend — Batch 4 (Aggregation & Trends)

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
app.disable("x-powered-by");

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "1.3-BATCH4"
};

/* ================= CORE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ================= SUPABASE ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ================= LOG ================= */
function log(level, message, meta = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  }));
}

/* ================= TRACE ================= */
app.use((req, res, next) => {
  req.request_id = crypto.randomUUID();
  const start = Date.now();

  res.on("finish", () => {
    log("info", "request_complete", {
      request_id: req.request_id,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - start
    });
  });

  next();
});

/* ================= HELPERS ================= */
const ok = (res, data) =>
  res.json({ success: true, request_id: res.req.request_id, data });

const fail = (res, status, msg) =>
  res.status(status).json({
    success: false,
    request_id: res.req.request_id,
    error: msg
  });

/* ================= RATE LIMIT ================= */
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: req => req.headers["x-api-key"] || req.ip
});

/* ================= AUTH ================= */
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];

  if (!apiKey || !gameId)
    return fail(res, 401, "Missing API credentials");

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");

  req.game_id = gameId;
  next();
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= OVERVIEW ================= */
v1.get(
  "/analytics/overview",
  readLimiter,
  apiAuth,
  async (req, res) => {
    try {
      const { data: decisions } = await supabase
        .from("risk_decisions")
        .select("risk_score, decision, signals")
        .eq("game_id", req.game_id);

      if (!decisions || decisions.length === 0)
        return ok(res, { message: "No data yet" });

      let totalRisk = 0;
      let go = 0, iterate = 0, kill = 0;
      let earlyExit = 0;
      let totalEngagement = 0;
      let totalDeathsRate = 0;

      decisions.forEach(d => {
        totalRisk += d.risk_score;

        if (d.decision === "GO") go++;
        if (d.decision === "ITERATE") iterate++;
        if (d.decision === "KILL") kill++;

        if (d.signals?.early_exit) earlyExit++;
        totalEngagement += d.signals?.engagement_score || 0;
        totalDeathsRate += d.signals?.deaths_per_minute || 0;
      });

      const count = decisions.length;

      ok(res, {
        sessions: count,
        avg_risk: Number((totalRisk / count).toFixed(2)),
        decisions: { go, iterate, kill },
        early_exit_rate: Number((earlyExit / count).toFixed(2)),
        avg_engagement: Number((totalEngagement / count).toFixed(2)),
        avg_deaths_per_minute: Number((totalDeathsRate / count).toFixed(2))
      });

    } catch (e) {
      log("error", "overview_failed", { error: e.message });
      fail(res, 500, "Overview analytics failed");
    }
  }
);

/* ================= TRENDS ================= */
v1.get(
  "/analytics/trends",
  readLimiter,
  apiAuth,
  async (req, res) => {
    try {
      const { data } = await supabase
        .from("risk_decisions")
        .select("risk_score, decision, created_at")
        .eq("game_id", req.game_id)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0)
        return ok(res, { message: "No trend data yet" });

      const timeline = data.map(d => ({
        date: d.created_at,
        risk: d.risk_score,
        decision: d.decision
      }));

      ok(res, { timeline });

    } catch (e) {
      log("error", "trends_failed", { error: e.message });
      fail(res, 500, "Trend analytics failed");
    }
  }
);

/* ================= HEALTH ================= */
app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString()
  })
);

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  log("info", "server_started", {
    version: CONFIG.VERSION,
    port: CONFIG.PORT
  });
});
