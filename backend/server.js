// LaunchSense Backend — Batch 12
// Export Engine (CSV)
// FULL REPLACE server.js | Render-ready

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { Parser } = require("json2csv");
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
  VERSION: "L12-EXPORT",
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

/* ================= ROUTER ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= EXPORT DECISIONS ================= */
v1.get("/export/decisions", apiAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("decision_logs")
      .select(
        "created_at, build_version, decision, risk_score, trend"
      )
      .eq("game_id", req.game_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0)
      return fail(res, 404, "No decision data available");

    const parser = new Parser({
      fields: [
        "created_at",
        "build_version",
        "decision",
        "risk_score",
        "trend",
      ],
    });

    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`launchsense-decisions-${req.game_id}.csv`);
    res.send(csv);
  } catch (e) {
    console.error(e);
    fail(res, 500, "CSV export failed");
  }
});

/* ================= EXPORT AUDIT ================= */
v1.get("/export/audit", apiAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from("audit_logs")
      .select("created_at, action, meta")
      .eq("game_id", req.game_id)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0)
      return fail(res, 404, "No audit logs");

    const parser = new Parser({
      fields: ["created_at", "action", "meta"],
    });

    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`launchsense-audit-${req.game_id}.csv`);
    res.send(csv);
  } catch (e) {
    console.error(e);
    fail(res, 500, "Audit export failed");
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
