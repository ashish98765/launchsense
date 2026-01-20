/**
 * LaunchSense Backend – Stable L5 + Recommendations
 * CommonJS | Render-ready | Supabase
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore } = require("./decisionEngine");
const { extractInsights } = require("./insightEngine");
const { generateRecommendations } = require("./recommendationEngine");

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
  VERSION: "L5-STABLE",
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
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

/* ================= TRACE LOGGER ================= */
app.use((req, res, next) => {
  req.request_id = crypto.randomUUID();
  const start = Date.now();

  res.on("finish", () => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        request_id: req.request_id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      })
    );
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

/* ================= PERSONA VIEW ================= */
function personaView(decision, risk) {
  return {
    founder: `Risk ${Math.round(risk * 100)}%`,
    designer: decision === "GO" ? "Healthy loop" : "Friction detected",
    investor:
      risk < 0.4 ? "Low risk" : risk > 0.6 ? "High risk" : "Moderate risk",
  };
}

/* ================= DECISION API ================= */
v1.post(
  "/sdk/decision",
  sdkLimiter,
  apiAuth,
  async (req, res) => {
    try {
      const risk = calculateRiskScore(req.body);

      let decision = "ITERATE";
      if (risk < CONFIG.BASE_GO) decision = "GO";
      if (risk > CONFIG.BASE_KILL) decision = "KILL";

      const insights = extractInsights(req.body);

      const recommendations = generateRecommendations({
        decision,
        risk_score: Math.round(risk * 100),
        insights,
      });

      await supabase.from("decision_logs").insert({
        game_id: req.game_id,
        decision,
        risk_score: Math.round(risk * 100),
        sessions_count: req.body.sessions?.length || 0,
        events_count: req.body.events?.length || 0,
      });

      ok(res, {
        decision,
        risk_score: Math.round(risk * 100),
        personas: personaView(decision, risk),
        insights,
        recommendations,
        version: CONFIG.VERSION,
      });
    } catch (e) {
      console.error(e);
      fail(res, 500, "Decision failed");
    }
  }
);

/* ================= HISTORY ================= */
v1.get("/history", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("decision,risk_score,created_at")
    .eq("game_id", req.game_id)
    .order("created_at", { ascending: false })
    .limit(20);

  ok(res, data || []);
});

/* ================= SUMMARY ================= */
v1.get("/summary", apiAuth, async (req, res) => {
  const { data } = await supabase
    .from("decision_logs")
    .select("risk_score,decision")
    .eq("game_id", req.game_id);

  if (!data || data.length === 0)
    return ok(res, { message: "No data yet" });

  const avgRisk =
    data.reduce((a, b) => a + b.risk_score, 0) / data.length;

  ok(res, {
    avg_risk: Math.round(avgRisk),
    last_decision: data[data.length - 1].decision,
    samples: data.length,
  });
});

/* ================= HEALTH ================= */
app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString(),
  })
);

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(
    `LaunchSense backend running on ${CONFIG.PORT} (${CONFIG.VERSION})`
  );
});
