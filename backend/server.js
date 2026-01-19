// LaunchSense Backend — STEP 81 to STEP 90 (SaaS Governance Layer)

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

// ================= CONFIG =================
["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "PORT"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY
};

// ================= SECURITY =================
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "50kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => req.timedout ? null : next());

// ================= REQUEST ID =================
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ================= BASE RATE LIMIT =================
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ================= SUPABASE =================
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ================= RESPONSE HELPERS =================
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

// ================= API VERSION =================
const v1 = express.Router();
app.use("/v1", v1);

// ================= API KEY AUTH =================
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

// ================= PROJECT GUARD =================
async function projectGuard(req, res, next) {
  const { data } = await supabase
    .from("projects")
    .select("status, deleted")
    .eq("game_id", req.game_id)
    .maybeSingle();

  if (!data || data.deleted)
    return fail(res, 403, "Project deleted");

  if (data.status !== "active")
    return fail(res, 403, "Project inactive");

  next();
}

// ================= PER PROJECT LIMIT =================
const projectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: req => req.game_id
});

// ================= HEALTH =================
v1.get("/", (_, res) => ok(res, { status: "LaunchSense v1 live" }));

// ================= CREATE PROJECT =================
v1.post("/projects", async (req, res) => {
  try {
    const { user_id, name } = req.body;
    if (!user_id || !name) return fail(res, 400, "Invalid payload");

    const game_id = "game_" + Date.now();
    const api_key = "ls_" + crypto.randomBytes(24).toString("hex");

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id,
        name,
        game_id,
        status: "active",
        deleted: false
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("api_keys").insert({
      game_id,
      api_key,
      revoked: false
    });

    ok(res, { project, api_key });
  } catch {
    fail(res, 500, "Create project failed");
  }
});

// ================= SOFT DELETE PROJECT (STEP 83) =================
v1.post("/projects/:game_id/delete", async (req, res) => {
  try {
    await supabase
      .from("projects")
      .update({ deleted: true })
      .eq("game_id", req.params.game_id);

    ok(res, { deleted: true });
  } catch {
    fail(res, 500, "Delete failed");
  }
});

// ================= DECISION API =================
v1.post(
  "/decision",
  apiAuth,
  projectGuard,
  projectLimiter,
  async (req, res) => {
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
  }
);

// ================= AUDIT LOG (STEP 85) =================
async function audit(event, meta = {}) {
  await supabase.from("audit_logs").insert({
    event,
    meta,
    at: new Date().toISOString()
  });
}

// ================= ANALYTICS SUMMARY =================
v1.get("/projects/:game_id/summary", async (req, res) => {
  try {
    const { data } = await supabase
      .from("daily_analytics")
      .select("*")
      .eq("game_id", req.params.game_id);

    if (!data || data.length === 0)
      return ok(res, { total_sessions: 0 });

    ok(res, {
      days: data.length,
      total_sessions: data.reduce((s, d) => s + d.total_sessions, 0),
      avg_risk:
        Math.round(
          data.reduce((s, d) => s + d.avg_risk, 0) / data.length
        ) || 0
    });
  } catch {
    fail(res, 500, "Analytics failed");
  }
});

// ================= SAFE SHUTDOWN (STEP 90) =================
process.on("SIGTERM", () => {
  console.log("Graceful shutdown");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Interrupted");
  process.exit(0);
});

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("LaunchSense v1 running on", CONFIG.PORT);
});
