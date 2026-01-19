// LaunchSense Backend — Phase 1 Intelligence Upgrade (Production Safe)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
app.disable("x-powered-by");

/* ============================
   REQUIRED ENV
============================ */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ============================
   CONFIG
============================ */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  VERSION: "1.1.0-intelligence",
};

/* ============================
   MIDDLEWARE
============================ */
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "200kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => (req.timedout ? null : next()));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
  })
);

app.use((req, res, next) => {
  req.req_id = crypto.randomUUID();
  req._start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - req._start;
    if (ms > 1500) console.warn("SLOW:", req.path, ms);
  });
  next();
});

/* ============================
   SUPABASE
============================ */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ============================
   HELPERS
============================ */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

/* ============================
   VERSIONED API
============================ */
const v1 = express.Router();
app.use("/v1", v1);

/* ============================
   HEALTH
============================ */
v1.get("/", (_, res) =>
  ok(res, { status: "LaunchSense live", version: CONFIG.VERSION })
);

/* ============================
   API KEY AUTH
============================ */
async function apiAuth(req, res, next) {
  const api_key = req.headers["x-api-key"];
  const game_id = req.headers["x-game-id"];

  if (!api_key || !game_id)
    return fail(res, 401, "Missing API credentials");

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");

  req.game_id = game_id;
  next();
}

/* ============================
   🧠 INTELLIGENCE ENGINE
============================ */
function buildSignals(payload) {
  const {
    playtime = 0,
    deaths = 0,
    restarts = 0,
    early_quit = false,
  } = payload;

  const engagement = Math.min(playtime / 600, 1);
  const frustration = Math.min((deaths * 2 + restarts) / 10, 1);
  const volatility = early_quit ? 0.7 : 0.2;

  return {
    engagement,
    frustration,
    volatility,
    early_quit: early_quit ? 1 : 0,
  };
}

function scoreDecision(signals) {
  const weights = {
    engagement: 0.35,
    frustration: 0.35,
    volatility: 0.2,
    early_quit: 0.1,
  };

  let risk =
    (1 - signals.engagement) * weights.engagement +
    signals.frustration * weights.frustration +
    signals.volatility * weights.volatility +
    signals.early_quit * weights.early_quit;

  risk = Math.min(Math.max(risk, 0), 1);

  let decision = "ITERATE";
  if (risk < 0.35) decision = "GO";
  if (risk > 0.65) decision = "KILL";

  const confidence = Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100;

  const reasons = [];
  if (signals.engagement < 0.4) reasons.push("Low engagement");
  if (signals.frustration > 0.6) reasons.push("High frustration");
  if (signals.early_quit) reasons.push("Early quit pattern");
  if (signals.volatility > 0.5) reasons.push("Volatile behavior");

  return {
    risk_score: Math.round(risk * 100),
    decision,
    confidence,
    signals,
    reasons,
  };
}

/* ============================
   CORE DECISION API (UPGRADED)
============================ */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const signals = buildSignals(req.body);
    const result = scoreDecision(signals);

    await supabase.from("game_sessions").insert({
      game_id: req.game_id,
      ...req.body,
      risk_score: result.risk_score,
      decision: result.decision,
      confidence: result.confidence,
      signals,
    });

    ok(res, result);
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision engine failed");
  }
});

/* ============================
   SHUTDOWN
============================ */
process.on("SIGTERM", () => process.exit());
process.on("SIGINT", () => process.exit());

/* ============================
   START
============================ */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
