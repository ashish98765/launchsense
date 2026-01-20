// LaunchSense Backend — Batch 6
// Multi-Game Portfolio + Studio-Level Intelligence
// SaaS-grade | Render-ready | Stable

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
  VERSION: "L6-PORTFOLIO",
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
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        id: req.request_id,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      })
    );
  });
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

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= BENCHMARK ================= */
function benchmarkTier(risk) {
  if (risk <= 30) return "top_25_percent";
  if (risk <= 45) return "above_average";
  if (risk <= 60) return "average";
  if (risk <= 75) return "below_average";
  return "bottom_25_percent";
}

/* ================= DECISION ================= */
v1.post("/sdk/decision", sdkLimiter, apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    const riskPct = Math.round(risk * 100);

    let decision = "ITERATE";
    if (risk < CONFIG.GO) decision = "GO";
    if (risk > CONFIG.KILL) decision = "KILL";

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      decision,
      risk_score: riskPct,
      benchmark_tier: benchmarkTier(riskPct),
    });

    ok(res, {
      decision,
      risk_score: riskPct,
      benchmark: benchmarkTier(riskPct),
      version: CONFIG.VERSION,
    });
  } catch {
    fail(res, 500, "Decision failed");
  }
});

/* ================= GAME SUMMARY ================= */
v1.get("/summary", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("risk_score, decision")
    .eq("game_id", req.game_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0)
    return ok(res, { message: "No data yet" });

  const avgRisk =
    data.reduce((a, b) => a + b.risk_score, 0) / data.length;

  ok(res, {
    average_risk: Math.round(avgRisk),
    benchmark: benchmarkTier(avgRisk),
    health:
      avgRisk < 40 ? "strong" : avgRisk < 60 ? "moderate" : "weak",
  });
});

/* ================= STUDIO PORTFOLIO ================= */
/*
  THIS is the SaaS killer endpoint.
  One view = all games, all risks, capital allocation clarity.
*/
v1.get("/portfolio", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("game_id, risk_score, decision")
    .eq("studio_id", req.studio_id);

  if (!data || data.length === 0)
    return ok(res, { message: "No portfolio data" });

  const games = {};

  data.forEach((row) => {
    if (!games[row.game_id]) {
      games[row.game_id] = {
        samples: 0,
        totalRisk: 0,
        kills: 0,
        gos: 0,
      };
    }
    games[row.game_id].samples++;
    games[row.game_id].totalRisk += row.risk_score;
    if (row.decision === "KILL") games[row.game_id].kills++;
    if (row.decision === "GO") games[row.game_id].gos++;
  });

  const portfolio = Object.entries(games).map(([gameId, g]) => {
    const avg = g.totalRisk / g.samples;
    return {
      game_id: gameId,
      avg_risk: Math.round(avg),
      benchmark: benchmarkTier(avg),
      signals: {
        samples: g.samples,
        go: g.gos,
        kill: g.kills,
      },
      status:
        avg < 40 ? "scale" : avg < 60 ? "iterate" : "terminate",
    };
  });

  ok(res, {
    studio_id: req.studio_id,
    total_games: portfolio.length,
    portfolio,
  });
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
