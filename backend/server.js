// LaunchSense Backend — STEP 38 to STEP 48 (HARDENED CORE)

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

// ---------- BASIC SECURITY ----------
app.use(helmet());

// ---------- STRICT CORS ----------
app.use(
  cors({
    origin: "*", // later tighten (STEP 53+)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key", "x-game-id"]
  })
);

// ---------- BODY LIMIT ----------
app.use(express.json({ limit: "50kb" }));

// ---------- REQUEST TIMEOUT ----------
app.use(timeout("10s"));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// ---------- REQUEST ID ----------
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

// ---------- STEP 38: IP RATE LIMIT ----------
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// ---------- STEP 39: API KEY RATE LIMIT ----------
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: req =>
    `${req.headers["x-game-id"] || "none"}:${req.headers["x-api-key"] || "none"}`
});

// ---------- SUPABASE ----------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ---------- HELPERS ----------
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

// ---------- API KEY MIDDLEWARE ----------
async function apiKeyMiddleware(req, res, next) {
  const { ["x-game-id"]: gameId, ["x-api-key"]: apiKey } = req.headers;
  if (!(await verifyApiKey(gameId, apiKey))) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  next();
}

// ---------- HEALTH ----------
app.get("/", (_, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// ---------- DEMO ----------
app.get("/api/demo/analytics", (_, res) => {
  res.json({ demo: true, health: "GO" });
});

// ---------- CREATE PROJECT ----------
app.post("/api/projects", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { user_id, name } = parsed.data;
  const game_id = "game_" + Date.now();
  const api_key = generateApiKey();

  const { error } = await supabase
    .from("projects")
    .insert([{ user_id, name, game_id }]);

  if (error) {
    return res.status(500).json({ error: "Project creation failed" });
  }

  await supabase.from("api_keys").insert({ game_id, api_key });

  res.json({ success: true, game_id, api_key });
});

// ---------- DECISION ----------
app.post(
  "/api/decision",
  apiKeyLimiter,
  apiKeyMiddleware,
  async (req, res) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid decision payload" });
    }

    const risk = calculateRiskScore(parsed.data);
    const decision = getDecision(risk);

    await supabase.from("game_sessions").insert({
      ...parsed.data,
      risk_score: risk,
      decision
    });

    res.json({ risk_score: risk, decision });
  }
);

// ---------- GLOBAL ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error("ERR", req.id, err.message);
  res.status(500).json({ error: "Internal error", request_id: req.id });
});

// ---------- START ----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("LaunchSense backend running on", PORT);
});
