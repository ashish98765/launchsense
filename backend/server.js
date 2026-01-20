// LaunchSense Backend — Batch 11
// Kill-Mode Lock + Irreversible Audit Trail
// FULL REPLACE server.js | Render-ready

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore } = require("./decisionEngine");

const app = express();
app.disable("x-powered-by");

/* ================= ENV ================= */
["SUPABASE_URL", "SUPABASE_SERVICE_KEY"].forEach((k) => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

/* ================= CONFIG ================= */
const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "L11-KILL-LOCK",
  GO: 0.35,
  KILL: 0.65,
};

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "300kb" }));

/* ================= SUPABASE ================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ================= TRACE ================= */
app.use((req, _, next) => {
  req.request_id = crypto.randomUUID();
  next();
});

/* ================= HELPERS ================= */
const ok = (res, data) =>
  res.json({ success: true, request_id: res.req.request_id, data });

const fail = (res, code, msg) =>
  res.status(code).json({
    success: false,
    request_id: res.req.request_id,
    error: msg,
  });

/* ================= RATE LIMIT ================= */
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
  })
);

/* ================= AUTH ================= */
async function apiAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];
  if (!apiKey || !gameId) return fail(res, 401, "Missing API credentials");

  const { data } = await supabase
    .from("api_keys")
    .select("studio_id")
    .eq("api_key", apiKey)
    .eq("game_id", gameId)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");

  req.game_id = gameId;
  req.studio_id = data.studio_id;
  next();
}

/* ================= CHECK KILL LOCK ================= */
async function isKilled(game_id) {
  const { data } = await supabase
    .from("kill_locks")
    .select("locked_at")
    .eq("game_id", game_id)
    .maybeSingle();

  return !!data;
}

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= DECISION API ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    if (await isKilled(req.game_id)) {
      return fail(
        res,
        423,
        "Game is permanently locked (KILL confirmed)."
      );
    }

    const metrics = {
      avg_playtime: req.body.avg_playtime || 0,
      deaths_per_session: req.body.deaths_per_session || 0,
      early_quit_rate: req.body.early_quit_rate || 0,
      sessions_reported: req.body.sessions_reported || 0,
      build_version: req.body.build_version || "unknown",
    };

    const riskRaw = calculateRiskScore(metrics);
    const risk = Math.round(riskRaw * 100);

    let decision = "ITERATE";
    if (riskRaw < CONFIG.GO) decision = "GO";
    if (riskRaw > CONFIG.KILL) decision = "KILL";

    await supabase.from("decision_logs").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      decision,
      risk_score: risk,
      build_version: metrics.build_version,
    });

    ok(res, {
      decision,
      risk_score: risk,
      kill_lock_required: decision === "KILL",
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision engine error");
  }
});

/* ================= CONFIRM KILL ================= */
v1.post("/sdk/confirm-kill", apiAuth, async (req, res) => {
  try {
    if (await isKilled(req.game_id)) {
      return fail(res, 409, "Game already permanently killed.");
    }

    const reason = req.body.reason || "No reason provided";

    await supabase.from("kill_locks").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      reason,
      locked_at: new Date().toISOString(),
    });

    await supabase.from("audit_logs").insert({
      game_id: req.game_id,
      studio_id: req.studio_id,
      action: "KILL_CONFIRMED",
      meta: { reason },
    });

    ok(res, {
      status: "LOCKED",
      message:
        "Game permanently locked. No further decisions or data accepted.",
      version: CONFIG.VERSION,
    });
  } catch (e) {
    console.error(e);
    fail(res, 500, "Kill lock failed");
  }
});

/* ================= HEALTH ================= */
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    version: CONFIG.VERSION,
    time: new Date().toISOString(),
  });
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on ${CONFIG.PORT}`);
});
