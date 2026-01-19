// LaunchSense Backend — STEP 38 + 39 + 40

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const timeout = require("connect-timeout");
require("dotenv").config();

const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");

const { calculateRiskScore, getDecision } = require("./decisionEngine");
const { createProjectSchema, decisionSchema } = require("./validators");

const app = express();

// ---------------- BASIC MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());

// ---------------- STEP 40 — REQUEST TIMEOUT ----------------
// Any request > 10 seconds will be killed
app.use(timeout("10s"));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// ---------------- STEP 38 — GLOBAL IP RATE LIMIT ----------------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Slow down." }
});
app.use(globalLimiter);

// ---------------- STEP 39 — API KEY RATE LIMIT ----------------
const apiKeyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    const gameId = req.headers["x-game-id"] || "unknown-game";
    const apiKey = req.headers["x-api-key"] || "unknown-key";
    return `${gameId}:${apiKey}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "API rate limit exceeded for this game." }
});

// ---------------- SUPABASE ----------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ---------------- HELPERS ----------------
function generateApiKey() {
  return "ls_" + crypto.randomBytes(24).toString("hex");
}

async function verifyApiKey(game_id, api_key) {
  if (!game_id || !api_key) return false;

  const { data, error } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// ---------------- API KEY MIDDLEWARE ----------------
async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];

  const valid = await verifyApiKey(gameId, apiKey);
  if (!valid) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}

// ---------------- HEALTH ----------------
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// ---------------- DEMO ----------------
app.get("/api/demo/analytics", (req, res) => {
  res.json({
    demo: true,
    game_id: "demo_game_001",
    total_sessions: 42,
    average_risk: 38,
    go_percent: 57,
    iterate_percent: 33,
    kill_percent: 10,
    health: "GO"
  });
});

// ================= CREATE PROJECT =================
app.post("/api/projects", async (req, res) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.errors
      });
    }

    const { user_id, name } = parsed.data;
    const game_id = "game_" + Date.now();
    const api_key = generateApiKey();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert([{ user_id, name, game_id }])
      .select();

    if (projectError) throw projectError;

    const { error: keyError } = await supabase
      .from("api_keys")
      .insert({ game_id, api_key, revoked: false });

    if (keyError) throw keyError;

    res.json({ success: true, project, api_key });
  } catch (e) {
    res.status(500).json({
      error: "Project creation failed",
      details: e.message
    });
  }
});

// ================= DECISION API =================
app.post(
  "/api/decision",
  apiKeyLimiter,
  apiKeyMiddleware,
  async (req, res) => {
    try {
      const parsed = decisionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid decision payload",
          details: parsed.error.errors
        });
      }

      const {
        game_id,
        player_id,
        session_id,
        playtime,
        deaths,
        restarts,
        early_quit
      } = parsed.data;

      const risk_score = calculateRiskScore({
        playtime,
        deaths,
        restarts,
        earlyQuit: early_quit
      });

      const decision = getDecision(risk_score);

      await supabase.from("game_sessions").insert({
        game_id,
        player_id,
        session_id,
        playtime,
        deaths,
        restarts,
        early_quit,
        risk_score,
        decision
      });

      res.json({ success: true, risk_score, decision });
    } catch (e) {
      if (req.timedout) {
        return res.status(408).json({ error: "Request timeout" });
      }
      res.status(500).json({ error: "Decision API failed" });
    }
  }
);

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("LaunchSense backend running on port", PORT);
});
