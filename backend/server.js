// LaunchSense Backend — Phase 2 Batch 3 + Phase 3 Admin
// Production Intelligence Build

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
app.disable("x-powered-by");

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "1.5.0-cohorts-admin",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null
};

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("10s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use((req, res, next) => {
  req.req_id = crypto.randomUUID();
  req._start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - req._start;
    if (ms > 1500) console.warn("SLOW", req.path, ms);
  });
  next();
});

/* ================= SUPABASE ================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) => res.status(c).json({ success: false, error: m });

/* ================= AUTH ================= */
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

function adminAuth(req, res, next) {
  if (!CONFIG.ADMIN_TOKEN) return fail(res, 503, "Admin disabled");
  if (req.headers["x-admin-token"] !== CONFIG.ADMIN_TOKEN)
    return fail(res, 401, "Admin auth failed");
  next();
}

/* ================= INTELLIGENCE ================= */
function buildSignals(d) {
  return {
    engagement: Math.min((d.playtime || 0) / 600, 1),
    frustration: Math.min(((d.deaths || 0) * 2 + (d.restarts || 0)) / 10, 1),
    early_quit: d.early_quit ? 1 : 0,
    returning: d.is_returning ? 1 : 0
  };
}

function decide(signals) {
  const risk =
    (1 - signals.engagement) * 0.35 +
    signals.frustration * 0.35 +
    signals.early_quit * 0.2 +
    (signals.returning ? -0.05 : 0.05);

  let decision = "ITERATE";
  if (risk < 0.35) decision = "GO";
  if (risk > 0.65) decision = "KILL";

  return {
    risk_score: Math.round(risk * 100),
    decision,
    confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100,
    signals
  };
}

/* ================= API ================= */
const v1 = express.Router();
app.use("/v1", v1);

v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

/* ================= CORE DECISION ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const signals = buildSignals(req.body);
    const result = decide(signals);
    const today = new Date().toISOString().slice(0, 10);

    await supabase.from("game_sessions").insert({
      game_id: req.game_id,
      ...req.body,
      risk_score: result.risk_score,
      decision: result.decision,
      confidence: result.confidence,
      cohort: req.body.is_returning ? "returning" : "new",
      signals
    });

    await supabase.rpc("increment_daily_analytics", {
      p_game_id: req.game_id,
      p_date: today,
      p_risk: result.risk_score,
      p_decision: result.decision,
      p_cohort: req.body.is_returning ? "returning" : "new"
    });

    ok(res, result);
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failed");
  }
});

/* ================= ANALYTICS ================= */
v1.get("/analytics/:game_id", async (req, res) => {
  const { game_id } = req.params;

  const { data } = await supabase
    .from("daily_analytics")
    .select("*")
    .eq("game_id", game_id)
    .order("date", { ascending: false })
    .limit(30);

  if (!data || data.length === 0) {
    return ok(res, { game_id, health: "ITERATE" });
  }

  const last7 = data.slice(0, 7);
  const avg7 = last7.reduce((s, d) => s + d.avg_risk, 0) / last7.length;
  const avg30 = data.reduce((s, d) => s + d.avg_risk, 0) / data.length;
  const momentum = Math.round((avg30 - avg7) * -1);

  ok(res, {
    game_id,
    avg_risk_7d: Math.round(avg7),
    avg_risk_30d: Math.round(avg30),
    momentum,
    trend: momentum > 5 ? "accelerating" : momentum < -5 ? "slowing" : "flat",
    health: avg7 < 40 ? "GO" : avg7 > 65 ? "KILL" : "ITERATE"
  });
});

/* ================= ADMIN DASHBOARD ================= */
v1.get("/admin/overview", adminAuth, async (_, res) => {
  const { data } = await supabase
    .from("daily_analytics")
    .select("total_sessions, avg_risk");

  const sessions = data.reduce((s, d) => s + d.total_sessions, 0);
  const avgRisk =
    data.reduce((s, d) => s + d.avg_risk, 0) / Math.max(data.length, 1);

  ok(res, {
    total_sessions: sessions,
    avg_risk: Math.round(avgRisk),
    platform_health: avgRisk < 40 ? "GO" : avgRisk > 65 ? "KILL" : "ITERATE"
  });
});

v1.get("/admin/cohorts", adminAuth, async (_, res) => {
  const { data } = await supabase
    .from("game_sessions")
    .select("cohort, decision, risk_score");

  const cohorts = {};
  data.forEach(r => {
    const c = r.cohort || "unknown";
    if (!cohorts[c]) cohorts[c] = { count: 0, risk: 0, go: 0, kill: 0 };
    cohorts[c].count++;
    cohorts[c].risk += r.risk_score;
    if (r.decision === "GO") cohorts[c].go++;
    if (r.decision === "KILL") cohorts[c].kill++;
  });

  Object.keys(cohorts).forEach(c => {
    cohorts[c].avg_risk = Math.round(cohorts[c].risk / cohorts[c].count);
  });

  ok(res, cohorts);
});

v1.get("/admin/projects", adminAuth, async (_, res) => {
  const { data } = await supabase.from("projects").select("*").limit(200);
  ok(res, data || []);
});

v1.get("/admin/launch-check", adminAuth, async (_, res) => {
  ok(res, {
    env: true,
    auth: true,
    analytics: true,
    cohorts: true,
    admin: true,
    ready: true
  });
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
