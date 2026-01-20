// LaunchSense Backend — Batch 4
// Benchmarks + Industry Comparison + Confidence
// Stable CommonJS | Render-safe

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
  VERSION: "L4-BENCHMARK",
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

/* ================= BENCHMARK ENGINE ================= */
/*
 Industry baseline (static for now, later dynamic):
  - Top 25% games: avg risk ~30
  - Median games: avg risk ~50
  - Bottom 25%: avg risk ~70
*/

function benchmarkPosition(risk) {
  if (risk <= 30)
    return { tier: "top_25_percent", confidence: "very_high" };
  if (risk <= 45)
    return { tier: "above_average", confidence: "high" };
  if (risk <= 60)
    return { tier: "average", confidence: "medium" };
  if (risk <= 75)
    return { tier: "below_average", confidence: "low" };
  return { tier: "bottom_25_percent", confidence: "very_low" };
}

/* ================= DECISION ================= */
v1.post("/sdk/decision", sdkLimiter, apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    const riskPct = Math.round(risk * 100);

    let decision = "ITERATE";
    if (risk < CONFIG.GO) decision = "GO";
    if (risk > CONFIG.KILL) decision = "KILL";

    const benchmark = benchmarkPosition(riskPct);

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      decision,
      risk_score: riskPct,
      benchmark_tier: benchmark.tier,
    });

    ok(res, {
      decision,
      risk_score: riskPct,
      benchmark,
      confidence_signal: benchmark.confidence,
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failed");
  }
});

/* ================= BENCHMARK API ================= */
v1.get("/benchmark", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("risk_score")
    .eq("game_id", req.game_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data || data.length === 0)
    return ok(res, { message: "No benchmark data yet" });

  const avg =
    data.reduce((a, b) => a + b.risk_score, 0) / data.length;

  const benchmark = benchmarkPosition(avg);

  ok(res, {
    average_risk: Math.round(avg),
    benchmark,
    industry_message:
      benchmark.tier === "top_25_percent"
        ? "Your game outperforms most launches."
        : benchmark.tier === "bottom_25_percent"
        ? "Your game underperforms industry baseline."
        : "Your game is close to industry average.",
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
