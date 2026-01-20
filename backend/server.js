// LaunchSense Backend — Batch 7
// AI Narrative + Insight Engine
// World-class SaaS backend | Render ready

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

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L7-NARRATIVE",
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
app.use((req, res, next) => {
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
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});

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

/* ================= AI NARRATIVE ENGINE ================= */
function generateNarrative({ risk, decision, metrics }) {
  const lines = [];

  if (decision === "GO") {
    lines.push(
      "Players are engaging positively with the core gameplay loop."
    );
  }

  if (decision === "ITERATE") {
    lines.push(
      "The game shows potential but certain friction points are holding it back."
    );
  }

  if (decision === "KILL") {
    lines.push(
      "Player behavior indicates fundamental issues with the core experience."
    );
  }

  if (metrics.early_quit_rate > 0.4) {
    lines.push(
      "A high number of players quit early, suggesting weak first-session retention."
    );
  }

  if (metrics.deaths_per_session > 5) {
    lines.push(
      "Frequent player deaths indicate difficulty spikes or unclear mechanics."
    );
  }

  if (metrics.avg_playtime < 300) {
    lines.push(
      "Average playtime is low, pointing to insufficient engagement depth."
    );
  }

  return lines.join(" ");
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", limiter, v1);

/* ================= DECISION + NARRATIVE ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    const riskPct = Math.round(risk * 100);

    let decision = "ITERATE";
    if (risk < CONFIG.GO) decision = "GO";
    if (risk > CONFIG.KILL) decision = "KILL";

    const metrics = {
      early_quit_rate: req.body.early_quit_rate || 0,
      deaths_per_session: req.body.deaths_per_session || 0,
      avg_playtime: req.body.avg_playtime || 0,
    };

    const narrative = generateNarrative({
      risk: riskPct,
      decision,
      metrics,
    });

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      decision,
      risk_score: riskPct,
      narrative,
    });

    ok(res, {
      decision,
      risk_score: riskPct,
      narrative,
      version: CONFIG.VERSION,
    });
  } catch {
    fail(res, 500, "Decision engine failed");
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
