// LaunchSense Backend — STEP 73 to STEP 80 (Production SaaS Layer)

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

// ================= RATE LIMITS =================
const baseLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: req =>
    `${req.headers["x-game-id"] || "anon"}:${req.headers["x-api-key"] || "none"}`
});

app.use(baseLimiter);

// ================= SUPABASE =================
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ================= HELPERS =================
function generateApiKey() {
  return "ls_" + crypto.randomBytes(24).toString("hex");
}

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, code, message) {
  return res.status(code).json({ success: false, error: message });
}

// ================= HEALTH =================
app.get("/", (req, res) => ok(res, { status: "LaunchSense backend running" }));

// ================= CREATE PROJECT =================
app.post("/api/projects", async (req, res) => {
  try {
    const { user_id, name } = req.body;
    if (!user_id || !name) return fail(res, 400, "user_id and name required");

    const game_id = "game_" + Date.now();
    const api_key = generateApiKey();

    const { data: project, error } = await supabase
      .from("projects")
      .insert({ user_id, name, game_id })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("api_keys").insert({
      game_id,
      api_key,
      revoked: false
    });

    ok(res, { project, api_key });
  } catch (e) {
    console.error("CREATE PROJECT ERROR", e);
    fail(res, 500, "Project creation failed");
  }
});

// ================= REVOKE API KEY (STEP 75) =================
app.post("/api/keys/revoke", async (req, res) => {
  try {
    const { game_id, api_key } = req.body;
    if (!game_id || !api_key) return fail(res, 400, "Missing fields");

    await supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("game_id", game_id)
      .eq("api_key", api_key);

    ok(res, { revoked: true });
  } catch (e) {
    fail(res, 500, "Revoke failed");
  }
});

// ================= API AUTH =================
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
  next();
}

// ================= DECISION API =================
app.post("/api/decision", apiLimiter, apiAuth, async (req, res) => {
  try {
    const data = req.body;
    const risk = calculateRiskScore(data);
    const decision = getDecision(risk);

    await supabase.from("game_sessions").insert({
      ...data,
      risk_score: risk,
      decision
    });

    ok(res, { risk_score: risk, decision });
  } catch (e) {
    fail(res, 500, "Decision failed");
  }
});

// ================= PROJECT ANALYTICS (STEP 76) =================
app.get("/api/projects/:game_id/summary", async (req, res) => {
  try {
    const { game_id } = req.params;
    const { data } = await supabase
      .from("daily_analytics")
      .select("*")
      .eq("game_id", game_id);

    if (!data || data.length === 0)
      return ok(res, { game_id, total_sessions: 0 });

    const total = data.reduce((s, d) => s + d.total_sessions, 0);
    const avgRisk = Math.round(
      data.reduce((s, d) => s + d.avg_risk, 0) / data.length
    );

    ok(res, {
      game_id,
      days: data.length,
      total_sessions: total,
      avg_risk: avgRisk
    });
  } catch (e) {
    fail(res, 500, "Analytics failed");
  }
});

// ================= DAILY REBUILD (STEP 77) =================
app.post("/api/admin/recompute-daily", async (req, res) => {
  try {
    await supabase.rpc("recompute_daily_analytics");
    ok(res, { recomputed: true });
  } catch (e) {
    fail(res, 500, "Recompute failed");
  }
});

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("LaunchSense running on", CONFIG.PORT);
});
