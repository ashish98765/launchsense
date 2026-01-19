// LaunchSense Backend — STEP 38 to STEP 64 (Auth + Isolation)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");
const { createProjectSchema, decisionSchema } = require("./validators");

const app = express();
app.disable("x-powered-by");

// ================= STEP 49–50: ENV + CONFIG =================
const REQUIRED_ENVS = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "PORT"];
REQUIRED_ENVS.forEach(k => {
  if (!process.env[k]) {
    console.error(`❌ Missing env: ${k}`);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY
};

// ================= BASIC SECURITY =================
app.use(helmet());
app.use(
  cors({
    origin: "*", // tighten later
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-game-id"]
  })
);
app.use(express.json({ limit: "50kb" }));

// ================= STEP 40: TIMEOUT =================
app.use(timeout("10s"));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// ================= REQUEST ID =================
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

// ================= STEP 38: IP RATE LIMIT =================
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ================= STEP 39: API KEY RATE LIMIT =================
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: req =>
    `${req.headers["x-game-id"] || "none"}:${req.headers["x-api-key"] || "none"}`
});

// ================= STEP 64: USER RATE LIMIT =================
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: req => req.user?.id || req.ip
});

// ================= SUPABASE =================
const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY
);

// ================= HELPERS =================
const asyncWrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function generateApiKey() {
  return "ls_" + crypto.randomBytes(24).toString("hex");
}

async function verifyApiKey(game_id, api_key) {
  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();
  return !!data;
}

// ================= STEP 57–58: AUTH MIDDLEWARE =================
async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const token = auth.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.user_metadata?.role || "user"
  };
  next();
}

// ================= API KEY MIDDLEWARE =================
async function apiKeyMiddleware(req, res, next) {
  const gameId = req.headers["x-game-id"];
  const apiKey = req.headers["x-api-key"];
  if (!(await verifyApiKey(gameId, apiKey))) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

// ================= HEALTH =================
app.get("/", (_, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// ================= STEP 59–60: CREATE PROJECT (USER OWNED) =================
app.post(
  "/api/projects",
  authMiddleware,
  userLimiter,
  asyncWrap(async (req, res) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { name } = parsed.data;
    const game_id = "game_" + Date.now();
    const api_key = generateApiKey();

    await supabase.from("projects").insert({
      user_id: req.user.id,
      name,
      game_id
    });

    await supabase.from("api_keys").insert({ game_id, api_key });

    res.json({ success: true, game_id, api_key });
  })
);

// ================= STEP 62: LIST PROJECTS (USER SCOPED) =================
app.get(
  "/api/projects",
  authMiddleware,
  userLimiter,
  asyncWrap(async (req, res) => {
    const { data } = await supabase
      .from("projects")
      .select("game_id, name, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    res.json({ projects: data || [] });
  })
);

// ================= STEP 61–63: DECISION (USER + API KEY) =================
app.post(
  "/api/decision",
  authMiddleware,
  userLimiter,
  apiKeyLimiter,
  apiKeyMiddleware,
  asyncWrap(async (req, res) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { game_id, session_id } = parsed.data;

    // Ownership check
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("game_id", game_id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (!project && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Duplicate session guard
    const { data: existing } = await supabase
      .from("game_sessions")
      .select("decision")
      .eq("game_id", game_id)
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      return res.json({ duplicate: true, decision: existing.decision });
    }

    // Kill-mode lock
    const { data: lastDecision } = await supabase
      .from("decisions")
      .select("final_decision")
      .eq("game_id", game_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastDecision?.final_decision === "KILL") {
      return res.status(403).json({ error: "Decision locked (KILL)" });
    }

    const risk = calculateRiskScore(parsed.data);
    const decision = getDecision(risk);

    await supabase.from("decisions").insert({
      game_id,
      user_id: req.user.id,
      risk_score: risk,
      final_decision: decision
    });

    try {
      await supabase.from("game_sessions").insert({
        ...parsed.data,
        risk_score: risk,
        decision
      });
    } catch (e) {
      console.error("DB write failed", e.message);
    }

    res.json({ risk_score: risk, decision });
  })
);

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("ERR", req.id, err.message);
  res.status(500).json({
    error: "Internal server error",
    request_id: req.id
  });
});

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("🚀 LaunchSense running on", CONFIG.PORT);
});
