// LaunchSense Backend — Layer 4 / Batch 4
// Persistence + Decision Memory

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

/* ===================== ENV CHECK ===================== */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ===================== CONFIG ===================== */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L4-B4",
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
};

/* ===================== CORE ===================== */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ===================== SUPABASE ===================== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ===================== LOGGER ===================== */
function log(level, message, meta = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      message,
      ...meta,
    })
  );
}

/* ===================== REQUEST TRACE ===================== */
app.use((req, res, next) => {
  req.request_id = crypto.randomUUID();
  req._start = Date.now();

  res.on("finish", () => {
    log("info", "request_complete", {
      request_id: req.request_id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - req._start,
    });
  });

  next();
});

/* ===================== HELPERS ===================== */
const ok = (res, data) =>
  res.json({ success: true, request_id: res.req.request_id, data });

const fail = (res, status, msg) => {
  log("warn", "request_failed", {
    request_id: res.req.request_id,
    status,
    error: msg,
  });
  res.status(status).json({
    success: false,
    request_id: res.req.request_id,
    error: msg,
  });
};

/* ===================== RATE LIMIT ===================== */
const sdkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
  handler: (_, res) => fail(res, 429, "Rate limit exceeded"),
});

/* ===================== AUTH ===================== */
async function apiAuth(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];
    const gameId = req.headers["x-game-id"];

    if (!apiKey || !gameId)
      return fail(res, 401, "Missing API credentials");

    const { data } = await supabase
      .from("api_keys")
      .select("id, revoked")
      .eq("api_key", apiKey)
      .eq("game_id", gameId)
      .maybeSingle();

    if (!data) return fail(res, 401, "Invalid API key");
    if (data.revoked) return fail(res, 403, "API key revoked");

    req.game_id = gameId;
    next();
  } catch (e) {
    log("error", "auth_error", { error: e.message });
    fail(res, 500, "Auth failure");
  }
}

/* ===================== VALIDATION ===================== */
function validateDecisionPayload(req, res, next) {
  const { sessions, events } = req.body || {};

  if (!Array.isArray(sessions) || sessions.length === 0)
    return fail(res, 400, "Invalid sessions");

  if (!Array.isArray(events))
    return fail(res, 400, "Invalid events");

  next();
}

/* ===================== ROUTER ===================== */
const v1 = express.Router();
app.use("/v1", v1);

/* ===================== HELPERS ===================== */
function personaView(decision, risk) {
  return {
    founder: `Risk ${Math.round(risk * 100)}%`,
    designer:
      decision === "GO" ? "Engagement healthy" : "Friction detected",
    investor:
      risk < 0.4
        ? "Low risk"
        : risk > 0.6
        ? "High risk"
        : "Moderate risk",
  };
}

/* ===================== DECISION ===================== */
v1.post(
  "/sdk/decision",
  sdkLimiter,
  apiAuth,
  validateDecisionPayload,
  async (req, res) => {
    try {
      const risk = calculateRiskScore(req.body);

      let decision = "ITERATE";
      if (risk < CONFIG.BASE_GO) decision = "GO";
      if (risk > CONFIG.BASE_KILL) decision = "KILL";

      // 🔥 SAVE TO DATABASE
      await supabase.from("decision_logs").insert({
        game_id: req.game_id,
        decision,
        risk_score: Math.round(risk * 100),
        sessions_count: req.body.sessions.length,
        events_count: req.body.events.length,
      });

      log("info", "decision_saved", {
        game_id: req.game_id,
        decision,
        risk,
      });

      ok(res, {
        decision,
        risk_score: Math.round(risk * 100),
        personas: personaView(decision, risk),
        version: CONFIG.VERSION,
      });
    } catch (e) {
      log("error", "decision_error", { error: e.message });
      fail(res, 500, "Decision failed");
    }
  }
);

/* ===================== HEALTH ===================== */
app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString(),
  })
);

/* ===================== START ===================== */
app.listen(CONFIG.PORT, () => {
  log("info", "server_started", {
    version: CONFIG.VERSION,
    port: CONFIG.PORT,
  });
});
