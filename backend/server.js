// LaunchSense Backend — Batch 1 (Ingestion Layer)

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const app = express();
app.disable("x-powered-by");

/* ================= ENV CHECK ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "1.0-BATCH1"
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

/* ================= LOGGER ================= */
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

  res.on("finish", ՀՀ () => {
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
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
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

/* ================= INGEST EVENTS ================= */
/*
Payload example:
{
  "session_id": "uuid",
  "events": [
    { "type": "level_start", "t": 0 },
    { "type": "death", "level": 1, "t": 32 }
  ]
}
*/

v1.post(
  "/sdk/events",
  ingestLimiter,
  apiAuth,
  async (req, res) => {
    try {
      const { session_id, events } = req.body;

      if (!session_id || !Array.isArray(events) || events.length === 0)
        return fail(res, 400, "Invalid ingestion payload");

      const rows = events.map(e => ({
        game_id: req.game_id,
        session_id,
        event_type: e.type || "unknown",
        payload: e,
        client_ts: e.t ?? null
      }));

      const { error } = await supabase
        .from("raw_events")
        .insert(rows);

      if (error) {
        log("error", "ingest_failed", { error });
        return fail(res, 500, "Failed to ingest events");
      }

      ok(res, {
        ingested: rows.length,
        session_id
      });

    } catch (e) {
      log("error", "ingest_exception", { error: e.message });
      fail(res, 500, "Ingestion error");
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
