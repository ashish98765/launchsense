/**
 * LaunchSense Backend
 * Role: HTTP Gateway + Auth + Rules + Persistence
 * Status: Production Hardened (RULES v1)
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

// Core pipeline
const { runDecisionPipeline } = require("./orchestrator");
const {
  observabilityMiddleware,
  trackDecision
} = require("./observability");

// ---------------- ENV CHECK ----------------
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("❌ Missing ENV:", k);
    process.exit(1);
  }
});

// ---------------- APP ----------------
const app = express();
app.disable("x-powered-by");

// ---------------- CONFIG ----------------
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "RULES-V1"
};

// ---------------- MIDDLEWARE ----------------
app.use(helmet());
app.use(cors());

app.use(
  express.json({
    limit: "100kb",
    strict: true
  })
);

app.use(observabilityMiddleware);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60
  })
);

// ---------------- SUPABASE ----------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ---------------- REQUEST TRACE ----------------
app.use((req, res, next) => {
  res.req_id = crypto.randomUUID();
  next();
});

// ---------------- HELPERS ----------------
function ok(res, data) {
  res.json({
    success: true,
    request_id: res.req_id,
    data
  });
}

function fail(res, code, msg) {
  res.status(code).json({
    success: false,
    request_id: res.req_id,
    error: msg
  });
}

// ---------------- AUTH ----------------
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];

  if (!apiKey || !gameId) {
    return fail(res, 401, "Missing API credentials");
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("studio_id, disabled")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (error || !data || data.disabled) {
    return fail(res, 401, "Invalid or disabled API key");
  }

  req.game_id = gameId;
  req.studio_id = data.studio_id;
  next();
}

// ---------------- ROUTER ----------------
const v1 = express.Router();
app.use("/v1", v1);

// ---------------- DECISION API ----------------
v1.post("/decide", apiAuth, async (req, res) => {
  try {
    const input = {
      game_id: req.game_id,
      player_id: req.body.player_id,
      session_id: req.body.session_id,
      playtime: req.body.playtime,
      deaths: req.body.deaths,
      restarts: req.body.restarts,
      early_quit: req.body.early_quit,
      sessions: req.body.sessions || [],
      events: req.body.events || []
    };

    // Load history
    const { data: history } = await supabase
      .from("decision_logs")
      .select("risk_score")
      .eq("game_id", req.game_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const result = await runDecisionPipeline({
      input,
      history: history || [],
      supabase
    });

    if (!result.ok) {
      return fail(res, 400, result);
    }

    // Persist decision
    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      decision: result.decision,
      risk_score: 50,
      confidence: result.confidence,
      build_version: CONFIG.VERSION,
      created_at: new Date().toISOString()
    });

    // Audit
    await supabase.from("audit_logs").insert({
      game_id: req.game_id,
      action: "DECISION_MADE",
      meta: result.ledger,
      created_at: new Date().toISOString()
    });

    trackDecision(result.decision);

    return ok(res, result);
  } catch (e) {
    console.error("🔥 Decision crash:", e);

    // FAIL-SAFE (MOST IMPORTANT)
    return ok(res, {
      decision: "ITERATE",
      confidence: "LOW",
      note: "Fallback decision (system error)"
    });
  }
});

// ---------------- HEALTH ----------------
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString()
  });
});

// ---------------- START ----------------
app.listen(CONFIG.PORT, () => {
  console.log(
    `🚀 LaunchSense ${CONFIG.VERSION} running on ${CONFIG.PORT}`
  );
});
