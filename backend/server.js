/**
 * LaunchSense Backend
 * API Gateway + Rules Engine
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { runDecisionPipeline } = require("./orchestrator");

// ---------------- ENV ----------------
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("❌ Missing ENV:", k);
    process.exit(1);
  }
});

const app = express();
app.disable("x-powered-by");

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb", strict: true }));

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

// ---------------- TRACE ----------------
app.use((req, res, next) => {
  res.req_id = crypto.randomUUID();
  next();
});

function ok(res, data) {
  res.json({ success: true, request_id: res.req_id, data });
}
function fail(res, code, msg) {
  res.status(code).json({ success: false, request_id: res.req_id, error: msg });
}

// ---------------- AUTH ----------------
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];
  if (!apiKey || !gameId) return fail(res, 401, "Missing API credentials");

  const { data } = await supabase
    .from("api_keys")
    .select("studio_id, disabled")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (!data || data.disabled)
    return fail(res, 401, "Invalid or disabled API key");

  req.game_id = gameId;
  next();
}

// ---------------- ROUTES ----------------
const v1 = express.Router();
app.use("/v1", v1);

v1.post("/decide", apiAuth, async (req, res) => {
  try {
    const input = {
      game_id: req.game_id,
      playtime: req.body.playtime,
      deaths: req.body.deaths,
      restarts: req.body.restarts,
      early_quit: req.body.early_quit
    };

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

    if (!result.ok) return fail(res, 400, result);

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      decision: result.decision,
      risk_score: result.risk_score || null,
      confidence: result.confidence,
      source: result.source,
      created_at: new Date().toISOString()
    });

    return ok(res, result);
  } catch (e) {
    console.error(e);
    return ok(res, {
      decision: "ITERATE",
      confidence: "LOW",
      note: "Fail-safe fallback"
    });
  }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 LaunchSense running")
);
