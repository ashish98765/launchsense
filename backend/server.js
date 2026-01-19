/**
 * LaunchSense Backend
 * Phase-1 Final Base (9.5+ Foundation)
 * Decision Intelligence • Temporal Context • Observability
 */

require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");

const { createClient } = require("@supabase/supabase-js");

const { calculateRiskScore, getDecision } = require("./decisionEngine");
const { analyzeTemporal } = require("./temporalEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");
const {
  observabilityMiddleware,
  trackDecision,
  getObservabilitySnapshot
} = require("./observability");

const app = express();
app.disable("x-powered-by");

/* ===================== ENV VALIDATION ===================== */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ===================== CONFIG ===================== */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "3.0.0-phase1",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  READONLY: process.env.FEATURE_READONLY === "on",
  AUTO_DECISION: process.env.FEATURE_AUTO_DECISION === "on",
  SLA_MS: Number(process.env.SLA_MAX_MS || 2500)
};

/* ===================== CORE MIDDLEWARE ===================== */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("10s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));
app.use(observabilityMiddleware);

/* ===================== REQUEST CONTEXT ===================== */
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - req.start;
    if (duration > CONFIG.SLA_MS) {
      console.warn("SLA_BREACH", {
        path: req.path,
        duration,
        request_id: req.id
      });
    }
  });

  next();
});

/* ===================== READONLY MODE ===================== */
app.use((req, res, next) => {
  if (CONFIG.READONLY && req.method !== "GET") {
    return res.status(503).json({
      success: false,
      error: "System in maintenance mode"
    });
  }
  next();
});

/* ===================== SUPABASE ===================== */
const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY,
  { auth: { persistSession: false } }
);

/* ===================== HELPERS ===================== */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

/* ===================== AUTH ===================== */
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

function adminAuth(req, res, next) {
  if (!CONFIG.ADMIN_TOKEN)
    return fail(res, 503, "Admin disabled");

  if (req.headers["x-admin-token"] !== CONFIG.ADMIN_TOKEN)
    return fail(res, 401, "Admin auth failed");

  next();
}

/* ===================== ROUTER ===================== */
const v1 = express.Router();
app.use("/v1", v1);

/* ===================== HEALTH ===================== */
v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

v1.get("/health", (_, res) =>
  ok(res, {
    uptime_sec: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    version: CONFIG.VERSION
  })
);

/* ===================== DECISION SDK ===================== */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    let decision = getDecision(risk);

    const { data: history } = await supabase
      .from("daily_analytics")
      .select("avg_risk")
      .eq("game_id", req.game_id)
      .order("date", { ascending: false })
      .limit(7);

    const temporal = analyzeTemporal(history || []);

    if (CONFIG.AUTO_DECISION) {
      if (
        temporal.shock ||
        temporal.trend === "DECLINING"
      ) {
        decision = "ITERATE";
      }
    } else {
      decision = "REVIEW";
    }

    const metrics = {
      engagement: Math.min((req.body.playtime || 0) / 600, 1),
      frustration: Math.min(
        ((req.body.deaths || 0) * 2 + (req.body.restarts || 0)) / 10,
        1
      ),
      early_exit: !!req.body.early_quit,
      confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100)
    };

    const explanation = buildExplanation(
      req.body,
      metrics,
      decision
    );

    const ledger = buildLedgerEntry({
      game_id: req.game_id,
      decision,
      source: CONFIG.AUTO_DECISION ? "AI" : "HUMAN",
      risk_score: Math.round(risk * 100),
      confidence: explanation.confidence,
      explanation_id: explanation.explanation_id,
      temporal,
      input: req.body
    });

    trackDecision(decision);

    ok(res, {
      decision,
      risk_score: ledger.risk_score,
      confidence: ledger.confidence,
      trend: temporal.trend,
      stability: temporal.stability,
      explanation
    });
  } catch (e) {
    console.error("Decision error:", e);
    fail(res, 500, "Decision engine failure");
  }
});

/* ===================== ADMIN ===================== */
v1.get("/admin/observability", adminAuth, (_, res) =>
  ok(res, getObservabilitySnapshot())
);

/* ===================== START ===================== */
app.listen(CONFIG.PORT, () => {
  console.log(
    `LaunchSense ${CONFIG.VERSION} running on port`,
    CONFIG.PORT
  );
});
