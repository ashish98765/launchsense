/**
 * LaunchSense Backend
 * Full Production Server
 * Version: L12-EXPORT
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { Parser } = require("json2csv");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

// Core
const { runDecisionPipeline } = require("./orchestrator");
const {
  observabilityMiddleware,
  trackDecision
} = require("./observability");

// Routes
const dashboardRoutes = require("./routes/dashboard");

// ------------------------------------------------------------------
// ENV VALIDATION
// ------------------------------------------------------------------
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("❌ Missing ENV:", k);
    process.exit(1);
  }
});

// ------------------------------------------------------------------
// APP INIT
// ------------------------------------------------------------------
const app = express();
app.disable("x-powered-by");

// ------------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------------
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L12-EXPORT"
};

// ------------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));
app.use(observabilityMiddleware);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60
  })
);

// ------------------------------------------------------------------
// SUPABASE
// ------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ------------------------------------------------------------------
// REQUEST TRACE
// ------------------------------------------------------------------
app.use((req, res, next) => {
  res.req_id = crypto.randomUUID();
  next();
});

// ------------------------------------------------------------------
// RESPONSE HELPERS
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// AUTH
// ------------------------------------------------------------------
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];

  if (!apiKey || !gameId) {
    return fail(res, 401, "Missing API credentials");
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("studio_id")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (error || !data) {
    return fail(res, 401, "Invalid API key");
  }

  req.game_id = gameId;
  req.studio_id = data.studio_id;
  next();
}

// ------------------------------------------------------------------
// ROUTER
// ------------------------------------------------------------------
const v1 = express.Router();
app.use("/v1", v1);

// ------------------------------------------------------------------
// DECISION API (CORE)
// ------------------------------------------------------------------
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

    const { data: history } = await supabase
      .from("decision_logs")
      .select("risk_score")
      .eq("game_id", req.game_id)
      .order("created_at", { ascending: true })
      .limit(20);

    const result = await runDecisionPipeline({
      input,
      history: history || []
    });

    if (!result.ok) {
      return fail(res, 400, result);
    }

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      decision: result.decision,
      risk_score: result.risk_score,
      confidence: result.confidence,
      trend: result.trend?.trend || "UNKNOWN",
      build_version: CONFIG.VERSION,
      created_at: new Date().toISOString()
    });

    await supabase.from("audit_logs").insert({
      game_id: req.game_id,
      action: "DECISION_MADE",
      meta: result.ledger,
      created_at: new Date().toISOString()
    });

    trackDecision(result.decision);

    return ok(res, result);

  } catch (e) {
    console.error(e);
    return fail(res, 500, "Decision pipeline failed");
  }
});

// ------------------------------------------------------------------
// DASHBOARD (READ ONLY)
// ------------------------------------------------------------------
v1.use("/dashboard", apiAuth, dashboardRoutes({ supabase }));

// ------------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------------
v1.get("/export/decisions", apiAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from("decision_logs")
      .select("created_at, build_version, decision, risk_score, trend")
      .eq("game_id", req.game_id)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) {
      return fail(res, 404, "No decision data");
    }

    const parser = new Parser({
      fields: ["created_at", "build_version", "decision", "risk_score", "trend"]
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`launchsense-decisions-${req.game_id}.csv`);
    res.send(parser.parse(data));

  } catch (e) {
    console.error(e);
    fail(res, 500, "CSV export failed");
  }
});

// ------------------------------------------------------------------
// HEALTH
// ------------------------------------------------------------------
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString()
  });
});

// ------------------------------------------------------------------
// START
// ------------------------------------------------------------------
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 LaunchSense ${CONFIG.VERSION} running on ${CONFIG.PORT}`);
});
