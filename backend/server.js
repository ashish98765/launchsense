// LaunchSense Backend — Batch 3
// History + Trends + Insight APIs
// Stable CommonJS build (Render safe)

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

/* ================= ENV CHECK ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L3-STABLE",
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
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

/* ================= TRACE ================= */
app.use((req, res, next) => {
  req.request_id = crypto.randomUUID();
  const start = Date.now();

  res.on("finish", () => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        request_id: req.request_id,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      })
    );
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
    error: msg,
  });

/* ================= RATE LIMIT ================= */
const sdkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
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

/* ================= PERSONA ================= */
function personaView(decision, risk) {
  return {
    founder: `Risk ${Math.round(risk * 100)}%`,
    designer:
      decision === "GO"
        ? "Healthy loop"
        : decision === "KILL"
        ? "Severe friction"
        : "Iteration required",
    investor:
      risk < 0.4
        ? "Low risk"
        : risk > 0.6
        ? "High risk"
        : "Moderate risk",
  };
}

/* ================= EXPLANATION ================= */
function explainDecision(decision) {
  if (decision === "GO")
    return "Players engage and improve across sessions.";
  if (decision === "KILL")
    return "Early churn dominates. Core loop fails.";
  return "Mixed signals. Needs iteration.";
}

/* ================= DECISION ================= */
v1.post("/sdk/decision", sdkLimiter, apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);

    let decision = "ITERATE";
    if (risk < CONFIG.BASE_GO) decision = "GO";
    if (risk > CONFIG.BASE_KILL) decision = "KILL";

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      decision,
      risk_score: Math.round(risk * 100),
      sessions_count: req.body.sessions?.length || 0,
      events_count: req.body.events?.length || 0,
    });

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      personas: personaView(decision, risk),
      explanation: explainDecision(decision),
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failed");
  }
});

/* ================= HISTORY ================= */
v1.get("/history", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("decision,risk_score,created_at")
    .eq("game_id", req.game_id)
    .order("created_at", { ascending: false })
    .limit(20);

  ok(res, data || []);
});

/* ================= TRENDS ================= */
v1.get("/trends", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("risk_score,created_at")
    .eq("game_id", req.game_id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (!data || data.length < 2)
    return ok(res, { trend: "insufficient_data" });

  const first = data[0].risk_score;
  const last = data[data.length - 1].risk_score;

  let trend = "stable";
  if (last < first - 5) trend = "improving";
  if (last > first + 5) trend = "degrading";

  ok(res, {
    trend,
    first_risk: first,
    last_risk: last,
    samples: data.length,
  });
});

/* ================= INSIGHT ================= */
v1.get("/insight", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("decision,risk_score")
    .eq("game_id", req.game_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data || data.length === 0)
    return ok(res, { message: "No insights yet" });

  const avg =
    data.reduce((a, b) => a + b.risk_score, 0) / data.length;

  let insight =
    avg < 40
      ? "Game shows healthy early signals."
      : avg > 60
      ? "Game repeatedly shows high risk."
      : "Game is unstable — iteration advised.";

  ok(res, {
    average_risk: Math.round(avg),
    insight,
    samples: data.length,
  });
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
  console.log(
    `LaunchSense backend ${CONFIG.VERSION} running on ${CONFIG.PORT}`
  );
});
