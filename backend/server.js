// LaunchSense Backend — Batch 1 (Decision Trust & Safety)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore } = require("./decisionEngine");
const { buildCounterfactuals } = require("./counterfactualEngine");

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
  VERSION: "5.0.0-BATCH1",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
  DRIFT_THRESHOLD: 0.18,
  KILL_COOLING_HOURS: 48
};

/* ================= CORE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("12s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

/* ================= SUPABASE ================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) =>
  res.status(c).json({ success: false, error: m });

/* ================= AUTH ================= */
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

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= UTILS ================= */
function confidenceBand(score) {
  if (score >= 0.75) return "HIGH";
  if (score >= 0.5) return "MEDIUM";
  return "LOW";
}

function detectDrift(current, historical) {
  if (!historical) return false;
  return Math.abs(current - historical) > CONFIG.DRIFT_THRESHOLD;
}

/* ================= DECISION ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);

    const { data: history } = await supabase
      .from("risk_history")
      .select("avg_risk")
      .eq("game_id", req.game_id)
      .maybeSingle();

    const drift = detectDrift(risk, history?.avg_risk);

    let decision = "ITERATE";
    if (risk < CONFIG.BASE_GO) decision = "GO";
    if (risk > CONFIG.BASE_KILL) decision = "KILL";

    const confidence_raw = 1 - Math.abs(0.5 - risk);
    const stability = drift ? 0.4 : 0.85;

    const confidence = Math.round(
      confidence_raw * stability * 100
    ) / 100;

    const counterfactuals = buildCounterfactuals({ risk });

    let kill_pending = false;
    if (decision === "KILL") {
      kill_pending = true;
      decision = "KILL_PENDING";
    }

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      confidence,
      confidence_band: confidenceBand(confidence),
      stability_score: stability,
      drift_detected: drift,
      kill_pending,
      cooling_hours: kill_pending
        ? CONFIG.KILL_COOLING_HOURS
        : null,
      counterfactuals
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failure");
  }
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(
    `LaunchSense ${CONFIG.VERSION} running`,
    CONFIG.PORT
  );
});
