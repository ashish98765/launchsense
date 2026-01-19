// LaunchSense Backend — Phase 4 + A2 Counterfactual Intelligence

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
  VERSION: "2.6.0-A2",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  READONLY: process.env.FEATURE_READONLY === "on"
};

/* ================= CORE MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(timeout("12s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req._start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - req._start;
    if (ms > 1500) console.warn("SLOW", req.path, ms);
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
const fail = (res, c, m) => res.status(c).json({ success: false, error: m });

/* ================= AUTH ================= */
async function apiAuth(req, res, next) {
  const api_key = req.headers["x-api-key"];
  const game_id = req.headers["x-game-id"];
  if (!api_key || !game_id) return fail(res, 401, "Missing API credentials");

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

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= HEALTH ================= */
v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

/* ================= SDK DECISION (A2) ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    const baseDecision = getDecision(risk);

    const base = {
      risk,
      confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100,
      momentum: req.body.momentum || 0
    };

    const counterfactuals = buildCounterfactuals(base);

    ok(res, {
      decision: baseDecision,
      risk_score: Math.round(risk * 100),
      counterfactuals
    });
  } catch (e) {
    console.error("Decision error:", e);
    fail(res, 500, "Decision engine failure");
  }
});

/* ================= ADMIN ================= */
v1.get("/admin/system-status", adminAuth, async (_, res) => {
  ok(res, {
    version: CONFIG.VERSION,
    readonly: CONFIG.READONLY
  });
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
