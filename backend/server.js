// LaunchSense Backend — PHASE 4 FINAL (Production)
// Auto-Decision + Kill-Switch + SaaS Hardening

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
  VERSION: "2.0.0-phase4-final",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  READONLY: process.env.FEATURE_READONLY === "on"
};

/* ================= MIDDLEWARE ================= */
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

/* ================= SUPABASE ================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) => res.status(c).json({ success: false, error: m });

/* ================= READ-ONLY GUARD ================= */
app.use((req, res, next) => {
  if (CONFIG.READONLY && req.method !== "GET") {
    return fail(res, 503, "System in maintenance mode");
  }
  next();
});

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
function decideRisk(d) {
  const engagement = Math.min((d.playtime || 0) / 600, 1);
  const frustration = Math.min(((d.deaths || 0) * 2 + (d.restarts || 0)) / 10, 1);
  const early = d.early_quit ? 1 : 0;

  const risk =
    (1 - engagement) * 0.4 +
    frustration * 0.4 +
    early * 0.2;

  let decision = "ITERATE";
  if (risk < 0.35) decision = "GO";
  if (risk > 0.65) decision = "KILL";

  return {
    risk_score: Math.round(risk * 100),
    decision,
    confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100
  };
}

/* ================= AUTO-POLICY ================= */
function autoPolicy(stats) {
  if (stats.avg_risk_7d < 35 && stats.momentum > 5) return "AUTO_GO";
  if (stats.avg_risk_7d > 70 && stats.momentum < -5) return "AUTO_KILL";
  return "AUTO_ITERATE";
}

/* ================= API ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= HEALTH ================= */
v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

/* ================= DECISION SDK ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const result = decideRisk(req.body);

    await supabase.from("game_sessions").insert({
      game_id: req.game_id,
      ...req.body,
      risk_score: result.risk_score,
      decision: result.decision,
      confidence: result.confidence
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

  if (!data || data.length === 0)
    return ok(res, { game_id, health: "ITERATE" });

  const last7 = data.slice(0, 7);
  const avg7 = last7.reduce((s, d) => s + d.avg_risk, 0) / last7.length;
  const avg30 = data.reduce((s, d) => s + d.avg_risk, 0) / data.length;
  const momentum = Math.round((avg30 - avg7) * -1);

  const stats = {
    game_id,
    avg_risk_7d: Math.round(avg7),
    avg_risk_30d: Math.round(avg30),
    momentum
  };

  ok(res, {
    ...stats,
    policy: autoPolicy(stats),
    health: avg7 < 40 ? "GO" : avg7 > 65 ? "KILL" : "ITERATE"
  });
});

/* ================= ADMIN ================= */
v1.get("/admin/system-status", adminAuth, async (_, res) => {
  ok(res, {
    version: CONFIG.VERSION,
    readonly: CONFIG.READONLY,
    admin_enabled: !!CONFIG.ADMIN_TOKEN
  });
});

v1.get("/admin/auto-decisions", adminAuth, async (_, res) => {
  const { data } = await supabase
    .from("daily_analytics")
    .select("game_id, avg_risk")
    .order("date", { ascending: false });

  const map = {};
  data.forEach(d => {
    if (!map[d.game_id]) map[d.game_id] = [];
    map[d.game_id].push(d.avg_risk);
  });

  const out = {};
  Object.keys(map).forEach(id => {
    const avg = map[id].reduce((s, v) => s + v, 0) / map[id].length;
    out[id] =
      avg < 35 ? "AUTO_GO" : avg > 70 ? "AUTO_KILL" : "AUTO_ITERATE";
  });

  ok(res, out);
});

v1.post("/admin/kill-switch/:game_id", adminAuth, async (req, res) => {
  await supabase
    .from("projects")
    .update({ killed: true })
    .eq("id", req.params.game_id);

  ok(res, { killed: true });
});

/* ================= SHUTDOWN ================= */
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
