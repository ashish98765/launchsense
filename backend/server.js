// LaunchSense Backend — Batch 2 (Explainable Decision Engine)
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
  VERSION: "L2-STABLE",
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
};

/* ================= CORE MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ================= SUPABASE ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ================= TRACE LOGGER ================= */
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

/* ================= PERSONA VIEW ================= */
function personaView(decision, risk) {
  return {
    founder: `Risk score ${Math.round(risk * 100)}%`,
    designer:
      decision === "GO"
        ? "Core loop feels healthy"
        : decision === "KILL"
        ? "Strong friction detected early"
        : "Mixed signals — iterate",
    investor:
      risk < 0.4
        ? "Low risk"
        : risk > 0.6
        ? "High risk"
        : "Moderate risk",
  };
}

/* ================= EXPLAINABILITY ================= */
function explainDecision(decision, risk) {
  if (decision === "GO") {
    return {
      summary: "Players are engaging and staying longer.",
      recommendation: "Proceed with confidence. Validate with larger sample.",
    };
  }

  if (decision === "KILL") {
    return {
      summary: "Early exits and friction dominate player behavior.",
      recommendation:
        "Pause production. Rework core loop before investing more.",
    };
  }

  return {
    summary: "Some engagement exists, but friction blocks consistency.",
    recommendation:
      "Iterate on difficulty, onboarding, or pacing before next test.",
  };
}

/* ================= DECISION API ================= */
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
      confidence:
        risk < 0.45 || risk > 0.55 ? "Medium" : "Low",
      personas: personaView(decision, risk),
      explanation: explainDecision(decision, risk),
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failed");
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
  console.log(
    `LaunchSense backend ${CONFIG.VERSION} running on ${CONFIG.PORT}`
  );
});
