// LaunchSense Backend — Batch 10
// Trend & Comparison Engine
// FULL REPLACE server.js | Render-ready

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore } = require("./decisionEngine");

const app = express();
app.disable("x-powered-by");

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L10-TRENDS",
  GO: 0.35,
  KILL: 0.65,
};

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ================= SUPABASE ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ================= TRACE ================= */
app.use((req, _, next) => {
  req.request_id = crypto.randomUUID();
  next();
});

/* ================= HELPERS ================= */
const ok = (res, data) =>
  res.json({ success: true, request_id: res.req.request_id, data });

const fail = (res, code, msg) =>
  res.status(code).json({
    success: false,
    request_id: res.req.request_id,
    error: msg,
  });

/* ================= RATE LIMIT ================= */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
  })
);

/* ================= AUTH ================= */
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];
  if (!apiKey || !gameId) return fail(res, 401, "Missing API credentials");

  const { data } = await supabase
    .from("api_keys")
    .select("studio_id")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");

  req.game_id = gameId;
  req.studio_id = data.studio_id;
  next();
}

/* ================= ABUSE ================= */
function trustAdjust(metrics) {
  let trust = 1.0;
  if (metrics.avg_playtime > 36000) trust -= 0.4;
  if (metrics.deaths_per_session > 50) trust -= 0.3;
  trust = Math.max(trust, 0.2);
  return trust;
}

/* ================= TREND ANALYSIS ================= */
function analyzeTrend(current, previous) {
  if (!previous) {
    return {
      trend: "NO_BASELINE",
      insight: "First build data. No comparison available yet.",
    };
  }

  const diff = current - previous;

  if (diff < -5) {
    return {
      trend: "IMPROVING",
      insight: "Risk score decreased meaningfully. Iteration working.",
    };
  }

  if (diff > 5) {
    return {
      trend: "DEGRADING",
      insight: "Risk score increased. Recent changes may be harmful.",
    };
  }

  return {
    trend: "STAGNANT",
    insight: "No significant movement. Changes not impactful yet.",
  };
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= DECISION + TREND API ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const metrics = {
      avg_playtime: req.body.avg_playtime || 0,
      deaths_per_session: req.body.deaths_per_session || 0,
      early_quit_rate: req.body.early_quit_rate || 0,
      sessions_reported: req.body.sessions_reported || 0,
      build_version: req.body.build_version || "unknown",
    };

    const trust = trustAdjust(metrics);
    const rawRisk = calculateRiskScore(metrics);
    const risk = Math.round(rawRisk * trust * 100);

    let decision = "ITERATE";
    if (rawRisk < CONFIG.GO) decision = "GO";
    if (rawRisk > CONFIG.KILL) decision = "KILL";

    const { data: last } = await supabase
      .from("decision_logs")
      .select("risk_score")
      .eq("game_id", req.game_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const trend = analyzeTrend(risk, last?.risk_score);

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      build_version: metrics.build_version,
      decision,
      risk_score: risk,
      trend: trend.trend,
    });

    ok(res, {
      decision,
      risk_score: risk,
      trend: trend.trend,
      insight: trend.insight,
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Trend engine failure");
  }
});

/* ================= HEALTH ================= */
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString(),
  });
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on ${CONFIG.PORT}`);
});
