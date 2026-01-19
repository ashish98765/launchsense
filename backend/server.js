// LaunchSense Backend — Phase 2 (Temporal Intelligence)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");
const { buildExplanation } = require("./explainEngine");
const { analyzeTemporal } = require("./temporalEngine");

const app = express();
app.disable("x-powered-by");

/* ===================== ENV ===================== */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ===================== CONFIG ===================== */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "2.2.0-temporal",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  READONLY: process.env.FEATURE_READONLY === "on"
};

/* ===================== MIDDLEWARE ===================== */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("10s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - req.start;
    if (ms > 1500) console.warn("SLOW", req.path, ms);
  });
  next();
});

/* ===================== READONLY ===================== */
app.use((req, res, next) => {
  if (CONFIG.READONLY && req.method !== "GET") {
    return res.status(503).json({ error: "Maintenance mode" });
  }
  next();
});

/* ===================== SUPABASE ===================== */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ===================== HELPERS ===================== */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) => res.status(c).json({ success: false, error: m });

/* ===================== AUTH ===================== */
async function apiAuth(req, res, next) {
  const api_key = req.headers["x-api-key"];
  const game_id = req.headers["x-game-id"];
  if (!api_key || !game_id) return fail(res, 401, "Missing API key");

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

/* ===================== API ===================== */
const v1 = express.Router();
app.use("/v1", v1);

/* ===================== HEALTH ===================== */
v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

/* ===================== DECISION SDK ===================== */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    // Step 1: Current risk
    const risk = calculateRiskScore(req.body);
    let decision = getDecision(risk);

    // Step 2: Fetch history
    const { data: history } = await supabase
      .from("daily_analytics")
      .select("avg_risk")
      .eq("game_id", req.game_id)
      .order("date", { ascending: false })
      .limit(7);

    // Step 3: Temporal analysis
    const temporal = analyzeTemporal(history || []);

    // Step 4: Decision override (intelligent)
    if (temporal.shock && decision === "KILL") {
      decision = "ITERATE";
    }
    if (temporal.trend === "DECLINING" && decision === "KILL") {
      decision = "ITERATE";
    }

    // Step 5: Explain
    const metrics = {
      engagement: Math.min((req.body.playtime || 0) / 600, 1),
      frustration: Math.min(((req.body.deaths || 0) * 2 + (req.body.restarts || 0)) / 10, 1),
      early_exit: !!req.body.early_quit,
      confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100
    };

    const explanation = buildExplanation(req.body, metrics, decision);

    // Step 6: Persist
    await supabase.from("game_sessions").insert({
      game_id: req.game_id,
      ...req.body,
      risk_score: Math.round(risk * 100),
      decision,
      confidence: explanation.confidence,
      explanation_id: explanation.explanation_id,
      temporal_trend: temporal.trend,
      temporal_volatility: temporal.volatility,
      temporal_shock: temporal.shock
    });

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      temporal,
      explanation
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failed");
  }
});

/* ===================== SHUTDOWN ===================== */
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

/* ===================== START ===================== */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
