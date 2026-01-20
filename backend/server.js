// LaunchSense Backend — Layer 2 / Batch 1
// Focus: Auth + Ownership Hardening

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore } = require("./decisionEngine");

const app = express();
app.disable("x-powered-by");

/* ===================== ENV CHECK ===================== */
[
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
].forEach((k) => {
  if (!process.env[k]) {
    console.error("❌ Missing ENV:", k);
    process.exit(1);
  }
});

/* ===================== CONFIG ===================== */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L2-B1",
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
};

/* ===================== CORE MIDDLEWARE ===================== */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ===================== SUPABASE ===================== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ===================== HELPERS ===================== */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, status, msg) =>
  res.status(status).json({ success: false, error: msg });

/* ===================== AUTH MIDDLEWARE ===================== */
async function apiAuth(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];
    const gameId = req.headers["x-game-id"];

    if (!apiKey || !gameId) {
      return fail(res, 401, "Missing API credentials");
    }

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, game_id, revoked")
      .eq("api_key", apiKey)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error || !data) {
      return fail(res, 401, "Invalid API key");
    }

    if (data.revoked) {
      return fail(res, 403, "API key revoked");
    }

    req.game_id = data.game_id;
    next();
  } catch (e) {
    console.error("AUTH ERROR:", e);
    return fail(res, 500, "Auth failure");
  }
}

/* ===================== ROUTER ===================== */
const v1 = express.Router();
app.use("/v1", v1);

/* ===================== PERSONA VIEWS ===================== */
function personaView(decision, risk) {
  return {
    founder: `Risk exposure is ${Math.round(risk * 100)}%. Decision: ${decision}.`,
    designer:
      decision === "GO"
        ? "Engagement signals are healthy."
        : "Gameplay friction detected. Iteration recommended.",
    investor:
      risk < 0.4
        ? "Favorable early signals."
        : risk > 0.6
        ? "High risk profile."
        : "Moderate risk with upside.",
  };
}

/* ===================== BENCHMARK ===================== */
function benchmarkSignal(risk) {
  if (risk < 0.35) return "Above industry average";
  if (risk > 0.65) return "Below industry average";
  return "Within industry norms";
}

/* ===================== PLAIN ENGLISH ===================== */
function explainPlain(decision, risk) {
  if (decision === "GO")
    return "Players are engaging and staying longer.";
  if (decision === "KILL")
    return "Players are leaving early with low retention.";
  return "Mixed signals detected. Improvements needed.";
}

/* ===================== DECISION ENDPOINT ===================== */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);

    let decision = "ITERATE";
    if (risk < CONFIG.BASE_GO) decision = "GO";
    if (risk > CONFIG.BASE_KILL) decision = "KILL";

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      personas: personaView(decision, risk),
      benchmark: benchmarkSignal(risk),
      plain_english: explainPlain(decision, risk),
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error("DECISION ERROR:", e);
    fail(res, 500, "Decision processing failed");
  }
});

/* ===================== START ===================== */
app.listen(CONFIG.PORT, () => {
  console.log(
    `🚀 LaunchSense ${CONFIG.VERSION} running on port ${CONFIG.PORT}`
  );
});
