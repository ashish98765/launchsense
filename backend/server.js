// LaunchSense Backend — Batch 3 (Risk Scoring Engine)

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
  VERSION: "1.2-BATCH3",

  THRESH_GO: 0.35,
  THRESH_KILL: 0.65
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
const sdkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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

/* ================= RISK ENGINE ================= */
function calculateRisk(signals) {
  let risk = 0;

  if (signals.early_exit) risk += 0.35;
  if (signals.deaths_per_minute > 3) risk += 0.30;
  if (signals.engagement_score < 0.2) risk += 0.35;

  return Math.min(1, Number(risk.toFixed(2)));
}

function decide(risk) {
  if (risk < CONFIG.THRESH_GO) return "GO";
  if (risk > CONFIG.THRESH_KILL) return "KILL";
  return "ITERATE";
}

/* ================= DECISION API ================= */
v1.post(
  "/sdk/decision",
  sdkLimiter,
  apiAuth,
  async (req, res) => {
    try {
      const { session_id } = req.body;
      if (!session_id) return fail(res, 400, "session_id required");

      const { data: signals } = await supabase
        .from("session_signals")
        .select("*")
        .eq("game_id", req.game_id)
        .eq("session_id", session_id)
        .maybeSingle();

      if (!signals)
        return fail(res, 404, "Signals not computed yet");

      const risk = calculateRisk(signals);
      const decision = decide(risk);

      const explanation =
        decision === "GO"
          ? "Players are engaging and progressing."
          : decision === "KILL"
          ? "High early abandonment and friction detected."
          : "Mixed signals. Iteration recommended.";

      await supabase.from("risk_decisions").insert({
        game_id: req.game_id,
        session_id,
        risk_score: risk,
        decision,
        signals,
        explanation
      });

      ok(res, {
        session_id,
        risk_score: risk,
        decision,
        explanation
      });

    } catch (e) {
      log("error", "decision_error", { error: e.message });
      fail(res, 500, "Decision engine failure");
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
