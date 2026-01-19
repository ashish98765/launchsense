// LaunchSense Backend — Phase 4 + A3 Explainability + OBS
// Decision Infrastructure Grade (Production)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");
const { buildCounterfactuals } = require("./counterfactualEngine");

const app = express();
app.disable("x-powered-by");

/* ================= ENV CHECK ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "3.0.0-A3-OBS",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  READONLY: process.env.FEATURE_READONLY === "on",
  SLA_MS: 1500,
  OBS_SAMPLE_RATE: 1 // keep 1 for now (can downsample later)
};

/* ================= CORE MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("12s"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600
  })
);

/* ================= OBS CONTEXT ================= */
app.use((req, res, next) => {
  req.obs = {
    request_id: crypto.randomUUID(),
    path: req.path,
    method: req.method,
    start: Date.now(),
    events: []
  };

  res.on("finish", () => {
    const duration = Date.now() - req.obs.start;
    req.obs.duration_ms = duration;

    if (duration > CONFIG.SLA_MS) {
      console.warn("SLA BREACH", {
        request_id: req.obs.request_id,
        path: req.path,
        duration
      });
    }
  });

  next();
});

/* ================= READONLY MODE ================= */
app.use((req, res, next) => {
  if (CONFIG.READONLY && req.method !== "GET") {
    return res.status(503).json({ error: "Maintenance mode" });
  }
  next();
});

/* ================= SUPABASE ================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

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

function adminAuth(req, res, next) {
  if (!CONFIG.ADMIN_TOKEN)
    return fail(res, 503, "Admin disabled");
  if (req.headers["x-admin-token"] !== CONFIG.ADMIN_TOKEN)
    return fail(res, 401, "Admin auth failed");
  next();
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= HEALTH ================= */
v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

/* =====================================================
   A3 — EXPLAINABLE DECISION ENGINE
   ===================================================== */
function buildExplanation(input, metrics, decision) {
  const reasons = [];

  if (metrics.engagement < 0.3) reasons.push("Low player engagement");
  if (metrics.frustration > 0.6) reasons.push("High frustration signals");
  if (metrics.early_exit) reasons.push("Early exit detected");

  return {
    explanation_id: crypto.randomUUID(),
    decision,
    confidence: metrics.confidence,
    primary_factors: reasons,
    metrics_used: metrics,
    generated_at: new Date().toISOString()
  };
}

/* ================= SDK DECISION (A3 + OBS) ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    let decision = getDecision(risk);

    const metrics = {
      engagement: Math.min((req.body.playtime || 0) / 600, 1),
      frustration: Math.min(
        ((req.body.deaths || 0) * 2 + (req.body.restarts || 0)) / 10,
        1
      ),
      early_exit: !!req.body.early_quit,
      confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100
    };

    const counterfactuals = buildCounterfactuals({ risk, ...metrics });

    if (counterfactuals.safest_decision !== decision) {
      decision = "REVIEW";
    }

    const explanation = buildExplanation(req.body, metrics, decision);

    /* OBS SNAPSHOT (safe, async, non-blocking) */
    if (Math.random() <= CONFIG.OBS_SAMPLE_RATE) {
      const obsPayload = {
        request_id: req.obs.request_id,
        game_id: req.game_id,
        decision,
        risk_score: Math.round(risk * 100),
        confidence: explanation.confidence,
        duration_ms: Date.now() - req.obs.start,
        created_at: new Date().toISOString()
      };

      supabase.from("decision_observability").insert(obsPayload).catch(() => {});
    }

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      confidence: explanation.confidence,
      explanation,
      counterfactuals
    });
  } catch (e) {
    console.error("Decision failure:", e);
    fail(res, 500, "Decision engine failure");
  }
});

/* ================= ADMIN OBS ================= */
v1.get("/admin/observability", adminAuth, async (_, res) => {
  const { data } = await supabase
    .from("decision_observability")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  ok(res, data || []);
});

/* ================= SHUTDOWN ================= */
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(
    `LaunchSense ${CONFIG.VERSION} running on port`,
    CONFIG.PORT
  );
});
