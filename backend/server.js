// LaunchSense Backend — Batch 9
// Recommendation Engine Layer
// Full replace server.js | Render-ready

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
  VERSION: "L9-RECOMMEND",
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

/* ================= ABUSE CHECK ================= */
function detectAbuse(metrics) {
  let trust = 1.0;
  let flags = [];

  if (metrics.avg_playtime > 36000) {
    trust -= 0.4;
    flags.push("IMPOSSIBLE_PLAYTIME");
  }
  if (metrics.deaths_per_session > 50) {
    trust -= 0.3;
    flags.push("BOT_PATTERN");
  }
  if (metrics.early_quit_rate === 0 || metrics.early_quit_rate === 1) {
    trust -= 0.2;
    flags.push("UNNATURAL_QUIT_RATE");
  }

  trust = Math.max(trust, 0.1);
  return { trust_score: trust, abuse_flags: flags };
}

/* ================= RECOMMENDATION ENGINE ================= */
function generateRecommendations(metrics) {
  const fixes = [];

  if (metrics.avg_playtime < 300) {
    fixes.push({
      area: "Onboarding",
      severity: "HIGH",
      recommendation:
        "Players are leaving too early. Simplify tutorial, reduce initial friction, and deliver core fun within first 60 seconds.",
    });
  }

  if (metrics.deaths_per_session > 10) {
    fixes.push({
      area: "Difficulty Curve",
      severity: "HIGH",
      recommendation:
        "Players are dying too often. Reduce early difficulty spikes or add assist mechanics.",
    });
  }

  if (metrics.early_quit_rate > 0.45) {
    fixes.push({
      area: "Retention",
      severity: "MEDIUM",
      recommendation:
        "High early quit detected. Add short-term goals, rewards, or narrative hooks in first sessions.",
    });
  }

  if (metrics.sessions_reported < 50) {
    fixes.push({
      area: "Test Size",
      severity: "LOW",
      recommendation:
        "Sample size too small. Collect more play sessions before making irreversible decisions.",
    });
  }

  if (fixes.length === 0) {
    fixes.push({
      area: "Core Loop",
      severity: "LOW",
      recommendation:
        "No critical issues detected. Focus on polishing visuals, pacing, and content depth.",
    });
  }

  return fixes;
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= DECISION API ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const metrics = {
      avg_playtime: req.body.avg_playtime || 0,
      deaths_per_session: req.body.deaths_per_session || 0,
      early_quit_rate: req.body.early_quit_rate || 0,
      sessions_reported: req.body.sessions_reported || 0,
    };

    const abuse = detectAbuse(metrics);
    let rawRisk = calculateRiskScore(metrics);
    let adjustedRisk = rawRisk * abuse.trust_score;
    let riskPct = Math.round(adjustedRisk * 100);

    let decision = "ITERATE";
    if (adjustedRisk < CONFIG.GO) decision = "GO";
    if (adjustedRisk > CONFIG.KILL) decision = "KILL";

    const recommendations = generateRecommendations(metrics);

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      decision,
      risk_score: riskPct,
      trust_score: abuse.trust_score,
      abuse_flags: abuse.abuse_flags,
      recommendations,
    });

    ok(res, {
      decision,
      risk_score: riskPct,
      trust_score: abuse.trust_score,
      recommendations,
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Recommendation engine failure");
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
