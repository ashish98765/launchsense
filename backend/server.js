// LaunchSense Backend — A4 Learning Engine (Production Final)

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

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "4.0.0-A4",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  READONLY: process.env.FEATURE_READONLY === "on",
  SLA_MS: 1500,
  BASE_GO: 0.35,
  BASE_KILL: 0.65,
  LEARN_RATE: 0.03
};

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("12s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use((req, res, next) => {
  req.ctx = {
    request_id: crypto.randomUUID(),
    start: Date.now()
  };
  res.on("finish", () => {
    const d = Date.now() - req.ctx.start;
    if (d > CONFIG.SLA_MS)
      console.warn("SLA breach", req.path, d);
  });
  next();
});

/* ================= READONLY ================= */
app.use((req, res, next) => {
  if (CONFIG.READONLY && req.method !== "GET")
    return res.status(503).json({ error: "Maintenance mode" });
  next();
});

/* ================= SUPABASE ================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) =>
  res.status(c).json({ success: false, error: m });

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
   A4 — POLICY ADAPTER
   ===================================================== */
function adaptThresholds(base, stats) {
  let go = base.go;
  let kill = base.kill;

  if (stats.retention_rate > 0.6) go -= CONFIG.LEARN_RATE;
  if (stats.rage_rate > 0.4) kill -= CONFIG.LEARN_RATE;

  go = Math.max(0.2, Math.min(go, 0.45));
  kill = Math.max(0.55, Math.min(kill, 0.8));

  return { go, kill };
}

/* ================= DECISION SDK ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);

    const { data: stats } = await supabase
      .from("learning_stats")
      .select("*")
      .eq("game_id", req.game_id)
      .maybeSingle();

    const policy = adaptThresholds(
      { go: CONFIG.BASE_GO, kill: CONFIG.BASE_KILL },
      stats || {}
    );

    let decision = "ITERATE";
    if (risk < policy.go) decision = "GO";
    if (risk > policy.kill) decision = "KILL";

    const counterfactuals = buildCounterfactuals({ risk });

    ok(res, {
      decision,
      risk_score: Math.round(risk * 100),
      policy,
      counterfactuals
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision engine failure");
  }
});

/* ================= OUTCOME INGEST ================= */
v1.post("/sdk/outcome", apiAuth, async (req, res) => {
  const { retained, rage_quit } = req.body;

  await supabase.rpc("update_learning_stats", {
    p_game_id: req.game_id,
    p_retained: !!retained,
    p_rage: !!rage_quit
  });

  ok(res, { learned: true });
});

/* ================= ADMIN ================= */
v1.get("/admin/learning", adminAuth, async (_, res) => {
  const { data } = await supabase
    .from("learning_stats")
    .select("*");
  ok(res, data || []);
});

/* ================= SHUTDOWN ================= */
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(
    `LaunchSense ${CONFIG.VERSION} running on`,
    CONFIG.PORT
  );
});
