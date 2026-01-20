// LaunchSense Backend — Batch 2 (Signal Extraction Layer)

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
  VERSION: "1.1-BATCH2"
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
const sdkLimiter = rateLimit({
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

/* ================= SIGNAL EXTRACTION ================= */
v1.post(
  "/sdk/signals",
  sdkLimiter,
  apiAuth,
  async (req, res) => {
    try {
      const { session_id } = req.body;
      if (!session_id) return fail(res, 400, "session_id required");

      const { data: events } = await supabase
        .from("raw_events")
        .select("event_type, payload")
        .eq("game_id", req.game_id)
        .eq("session_id", session_id);

      if (!events || events.length === 0)
        return fail(res, 404, "No events found");

      const deaths = events.filter(e => e.event_type === "death").length;
      const eventsCount = events.length;

      const timestamps = events
        .map(e => e.payload?.t)
        .filter(t => typeof t === "number");

      const duration =
        timestamps.length > 1
          ? Math.max(...timestamps)
          : 0;

      const minutes = Math.max(duration / 60, 1);

      const earlyExit = duration < 180;
      const deathsPerMinute = deaths / minutes;

      const engagementScore = Math.min(
        1,
        eventsCount / Math.max(duration, 30)
      );

      const { error } = await supabase
        .from("session_signals")
        .upsert({
          game_id: req.game_id,
          session_id,
          session_duration: Math.round(duration),
          events_count: eventsCount,
          deaths_count: deaths,
          deaths_per_minute: deathsPerMinute,
          early_exit: earlyExit,
          engagement_score: engagementScore
        });

      if (error) {
        log("error", "signal_insert_failed", { error });
        return fail(res, 500, "Signal computation failed");
      }

      ok(res, {
        session_id,
        early_exit: earlyExit,
        deaths,
        deaths_per_minute: deathsPerMinute,
        engagement_score: engagementScore
      });

    } catch (e) {
      log("error", "signal_exception", { error: e.message });
      fail(res, 500, "Signal extraction error");
    }
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
