// LaunchSense Backend — Batch 3 (Simulation + Data Quality Intelligence)

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
  VERSION: "5.2.0-BATCH3",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  BASE_GO: 0.35,
  BASE_KILL: 0.65
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

/* ================= DATA QUALITY ================= */
function assessQuality(body) {
  let score = 1;
  const issues = [];

  if (!body.playtime) {
    score -= 0.3;
    issues.push("Missing playtime");
  }
  if (body.deaths === undefined) {
    score -= 0.2;
    issues.push("Missing deaths");
  }
  if (body.sessions && body.sessions < 3) {
    score -= 0.2;
    issues.push("Low sample size");
  }

  score = Math.max(score, 0.2);

  return {
    quality_score: Math.round(score * 100) / 100,
    issues,
    reliable: score >= 0.6
  };
}

/* ================= DECISION ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const quality = assessQuality(req.body);
    const risk = calculateRiskScore(req.body);

    let decision = "ITERATE";
    if (risk < CONFIG.BASE_GO) decision = "GO";
    if (risk > CONFIG.BASE_KILL) decision = "KILL";

    const counterfactuals = buildCounterfactuals({ risk });

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      data_quality: quality,
      decision_reliability: quality.reliable
        ? "HIGH"
        : "LOW",
      counterfactuals
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failure");
  }
});

/* ================= SIMULATION ================= */
v1.post("/sdk/simulate", apiAuth, async (req, res) => {
  try {
    const base = req.body.base;
    const changes = req.body.changes || {};

    if (!base)
      return fail(res, 400, "Missing base metrics");

    const simulated = { ...base, ...changes };
    const risk = calculateRiskScore(simulated);

    let decision = "ITERATE";
    if (risk < CONFIG.BASE_GO) decision = "GO";
    if (risk > CONFIG.BASE_KILL) decision = "KILL";

    ok(res, {
      simulated_decision: decision,
      simulated_risk: Math.round(risk * 100),
      applied_changes: changes
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Simulation failure");
  }
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(
    `LaunchSense ${CONFIG.VERSION} running`,
    CONFIG.PORT
  );
});
