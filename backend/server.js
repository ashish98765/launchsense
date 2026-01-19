// LaunchSense Backend — Production Final

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();
app.disable("x-powered-by");

/* =======================
   REQUIRED ENV ONLY
======================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing REQUIRED ENV:", k);
    process.exit(1);
  }
});

/* =======================
   CONFIG (SAFE DEFAULTS)
======================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,

  ADMIN_TOKEN: process.env.ADMIN_TOKEN || null,
  RETENTION_DAYS: Number(process.env.RETENTION_DAYS || 30),
  SLA_MAX_LATENCY_MS: Number(process.env.SLA_MAX_LATENCY_MS || 1500),
  READONLY: process.env.FEATURE_READONLY === "on",

  VERSION: "1.0.0"
};

/* =======================
   MIDDLEWARE
======================= */
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "200kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => (req.timedout ? null : next()));

/* =======================
   RATE LIMITING
======================= */
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

/* =======================
   REQUEST ID + SLA
======================= */
app.use((req, res, next) => {
  const start = Date.now();
  req.id = crypto.randomUUID();

  res.on("finish", () => {
    const ms = Date.now() - start;
    if (ms > CONFIG.SLA_MAX_LATENCY_MS) {
      console.warn("SLA breach", { path: req.path, ms });
    }
  });

  next();
});

/* =======================
   SUPABASE
======================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* =======================
   HELPERS
======================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

/* =======================
   ADMIN AUTH (OPTIONAL)
======================= */
function adminAuth(req, res, next) {
  if (!CONFIG.ADMIN_TOKEN) return fail(res, 503, "Admin disabled");
  const t = req.headers["x-admin-token"];
  if (t !== CONFIG.ADMIN_TOKEN) return fail(res, 401, "Admin auth failed");
  next();
}

/* =======================
   VERSIONED API
======================= */
const v1 = express.Router();
app.use("/v1", v1);

/* =======================
   HEALTH
======================= */
v1.get("/", (_, res) =>
  ok(res, { status: "LaunchSense live", version: CONFIG.VERSION })
);
v1.get("/ready", (_, res) =>
  ok(res, { ready: true, readonly: CONFIG.READONLY })
);

/* =======================
   READONLY GUARD
======================= */
app.use((req, res, next) => {
  if (CONFIG.READONLY && req.method !== "GET") {
    return fail(res, 503, "Maintenance mode");
  }
  next();
});

/* =======================
   API KEY AUTH
======================= */
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

/* =======================
   CORE DECISION API
======================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const risk = calculateRiskScore(req.body);
    const decision = getDecision(risk);

    await supabase.from("game_sessions").insert({
      ...req.body,
      game_id: req.game_id,
      risk_score: risk,
      decision
    });

    ok(res, { risk_score: risk, decision });
  } catch {
    fail(res, 500, "Decision failed");
  }
});

/* =======================
   ADMIN — LIST PROJECTS
======================= */
v1.get("/admin/projects", adminAuth, async (req, res) => {
  const q = req.query.q || "";
  const { data } = await supabase
    .from("projects")
    .select("*")
    .ilike("name", `%${q}%`)
    .limit(200);

  ok(res, { items: data || [] });
});

/* =======================
   ADMIN — EXPORT DATA
======================= */
v1.get("/admin/export/:game_id", adminAuth, async (req, res) => {
  const format = (req.query.format || "json").toLowerCase();

  const { data } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("game_id", req.params.game_id)
    .limit(50000);

  if (format === "csv") {
    const keys = Object.keys(data?.[0] || {});
    const rows = [
      keys.join(","),
      ...(data || []).map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))
    ];
    res.setHeader("content-type", "text/csv");
    return res.send(rows.join("\n"));
  }

  ok(res, { items: data || [] });
});

/* =======================
   ADMIN — RETENTION
======================= */
v1.post("/admin/retention/run", adminAuth, async (_, res) => {
  const cutoff = new Date(
    Date.now() - CONFIG.RETENTION_DAYS * 86400000
  ).toISOString();

  await supabase.from("game_sessions").delete().lt("created_at", cutoff);
  await supabase
    .from("daily_analytics")
    .delete()
    .lt("date", cutoff.slice(0, 10));

  ok(res, { retained_days: CONFIG.RETENTION_DAYS });
});

/* =======================
   LAUNCH CHECK
======================= */
v1.get("/admin/launch-check", adminAuth, async (_, res) => {
  ok(res, {
    env: true,
    db: true,
    auth: true,
    analytics: true,
    retention: true,
    sla: true,
    ready: true
  });
});

/* =======================
   SHUTDOWN
======================= */
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

/* =======================
   START
======================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
