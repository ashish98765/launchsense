// LaunchSense Backend — Batch 5 (Persona APIs)

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
app.disable("x-powered-by");

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "1.4-BATCH5"
};

/* ================= CORE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ================= SUPABASE ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ================= LOG ================= */
function log(level, message, meta = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  }));
}

/* ================= TRACE ================= */
app.use((req, res, next) => {
  req.request_id = crypto.randomUUID();
  const start = Date.now();

  res.on("finish", () => {
    log("info", "request_complete", {
      request_id: req.request_id,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - start
    });
  });

  next();
});

/* ================= HELPERS ================= */
const ok = (res, data) =>
  res.json({ success: true, request_id: res.req.request_id, data });

const fail = (res, status, msg) =>
  res.status(status).json({
    success: false,
    request_id: res.req.request_id,
    error: msg
  });

/* ================= RATE LIMIT ================= */
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: req => req.headers["x-api-key"] || req.ip
});

/* ================= AUTH ================= */
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];

  if (!apiKey || !gameId)
    return fail(res, 401, "Missing API credentials");

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");

  req.game_id = gameId;
  next();
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= PERSONA: FOUNDER ================= */
v1.get(
  "/persona/founder",
  readLimiter,
  apiAuth,
  async (req, res) => {
    const { data } = await supabase
      .from("risk_decisions")
      .select("risk_score, decision")
      .eq("game_id", req.game_id);

    if (!data || data.length === 0)
      return ok(res, { message: "No data yet" });

    let go = 0, iterate = 0, kill = 0;
    let avgRisk = 0;

    data.forEach(d => {
      avgRisk += d.risk_score;
      if (d.decision === "GO") go++;
      if (d.decision === "ITERATE") iterate++;
      if (d.decision === "KILL") kill++;
    });

    avgRisk /= data.length;

    ok(res, {
      sessions: data.length,
      avg_risk: Number(avgRisk.toFixed(2)),
      decision_bias: { go, iterate, kill },
      verdict:
        avgRisk < 0.4
          ? "Healthy trajectory"
          : avgRisk > 0.65
          ? "High risk — reconsider investment"
          : "Needs iteration"
    });
  }
);

/* ================= PERSONA: DESIGNER ================= */
v1.get(
  "/persona/designer",
  readLimiter,
  apiAuth,
  async (req, res) => {
    const { data } = await supabase
      .from("session_signals")
      .select("*")
      .eq("game_id", req.game_id);

    if (!data || data.length === 0)
      return ok(res, { message: "No data yet" });

    const friction = data.filter(s => s.early_exit).length;
    const avgDeaths =
      data.reduce((a, b) => a + (b.deaths_per_minute || 0), 0) /
      data.length;

    const avgEngagement =
      data.reduce((a, b) => a + (b.engagement_score || 0), 0) /
      data.length;

    ok(res, {
      sessions: data.length,
      early_exit_sessions: friction,
      avg_deaths_per_minute: Number(avgDeaths.toFixed(2)),
      avg_engagement: Number(avgEngagement.toFixed(2)),
      focus_hint:
        friction / data.length > 0.4
          ? "Players quitting early — tutorial or difficulty issue"
          : "Core loop mostly engaging"
    });
  }
);

/* ================= PERSONA: INVESTOR ================= */
v1.get(
  "/persona/investor",
  readLimiter,
  apiAuth,
  async (req, res) => {
    const { data } = await supabase
      .from("risk_decisions")
      .select("risk_score, decision")
      .eq("game_id", req.game_id);

    if (!data || data.length === 0)
      return ok(res, { message: "No data yet" });

    const kills = data.filter(d => d.decision === "KILL").length;
    const avgRisk =
      data.reduce((a, b) => a + b.risk_score, 0) / data.length;

    const confidence = Math.max(
      0,
      1 - Math.abs(avgRisk - 0.5) * 2
    );

    ok(res, {
      sessions: data.length,
      kill_ratio: Number((kills / data.length).toFixed(2)),
      avg_risk: Number(avgRisk.toFixed(2)),
      confidence_score: Number(confidence.toFixed(2)),
      investor_signal:
        confidence > 0.7
          ? "Consistent data — monitor closely"
          : "Volatile signals — high uncertainty"
    });
  }
);

/* ================= HEALTH ================= */
app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString()
  })
);

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  log("info", "server_started", {
    version: CONFIG.VERSION,
    port: CONFIG.PORT
  });
});
