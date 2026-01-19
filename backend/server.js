// LaunchSense Backend — Batch 4 (Persona Views + Benchmarks + Plain English)

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore } = require("./decisionEngine");

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
  VERSION: "5.3.0-BATCH4",
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
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) =>
  res.status(c).json({ success: false, error: m });

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

/* ================= PERSONA VIEWS ================= */
function personaView(decision, risk) {
  return {
    founder: `This game carries ${Math.round(
      risk * 100
    )}% risk. Decision: ${decision}.`,
    designer: `Gameplay signals suggest ${
      decision === "GO"
        ? "strong engagement."
        : "design iteration is needed."
    }`,
    investor: `Risk profile is ${
      risk < 0.4
        ? "favorable"
        : risk > 0.6
        ? "high"
        : "moderate"
    } with decision ${decision}.`
  };
}

/* ================= BENCHMARK ================= */
function benchmarkSignal(risk) {
  if (risk < 0.35) return "Above industry average";
  if (risk > 0.65) return "Below industry average";
  return "Within industry norms";
}

/* ================= PLAIN ENGLISH ================= */
function explainPlain(decision, risk) {
  if (decision === "GO")
    return "Players are enjoying the game and staying engaged.";
  if (decision === "KILL")
    return "Players are leaving early and the game is not retaining interest.";
  return "Some players enjoy the game, but improvements are needed before launch.";
}

/* ================= DECISION ================= */
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
      plain_english: explainPlain(decision, risk)
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
