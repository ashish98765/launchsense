// LaunchSense Backend — STEP 63 → STEP 70 (Analytics Core Complete)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();
app.disable("x-powered-by");

// ================= CONFIG =================
["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "PORT"].forEach((k) => {
  if (!process.env[k]) {
    console.error("Missing env:", k);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
};

// ================= SECURITY =================
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "50kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => (!req.timedout ? next() : null));

// ================= REQUEST ID =================
app.use((req, _, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ================= RATE LIMIT =================
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) =>
    `${req.headers["x-game-id"]}:${req.headers["x-api-key"]}`,
});

// ================= SUPABASE =================
const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY
);

// ================= ANALYTICS CACHE (STEP 64) =================
const analyticsCache = new Map();
const CACHE_TTL = 60 * 1000;

function setCache(game_id, data) {
  analyticsCache.set(game_id, { data, ts: Date.now() });
}

function getCache(game_id) {
  const entry = analyticsCache.get(game_id);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    analyticsCache.delete(game_id);
    return null;
  }
  return entry.data;
}

// ================= HEALTH =================
app.get("/", (_, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// ================= DECISION API =================
app.post("/api/decision", apiLimiter, async (req, res) => {
  try {
    const data = req.body;

    if (!data.game_id || !data.player_id || !data.session_id) {
      return res.status(400).json({ error: "Missing identifiers" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const risk = calculateRiskScore(data);
    const decision = getDecision(risk);

    // save session
    await supabase.from("game_sessions").insert({
      ...data,
      risk_score: risk,
      decision,
    });

    // STEP 65–67: daily aggregation
    const { data: row } = await supabase
      .from("daily_analytics")
      .select("*")
      .eq("game_id", data.game_id)
      .eq("date", today)
      .maybeSingle();

    if (!row) {
      await supabase.from("daily_analytics").insert({
        game_id: data.game_id,
        date: today,
        total_sessions: 1,
        avg_risk: risk,
        go_count: decision === "GO" ? 1 : 0,
        iterate_count: decision === "ITERATE" ? 1 : 0,
        kill_count: decision === "KILL" ? 1 : 0,
      });
    } else {
      const total = row.total_sessions + 1;
      const avg = Math.round(
        (row.avg_risk * row.total_sessions + risk) / total
      );

      await supabase
        .from("daily_analytics")
        .update({
          total_sessions: total,
          avg_risk: avg,
          go_count: row.go_count + (decision === "GO" ? 1 : 0),
          iterate_count: row.iterate_count + (decision === "ITERATE" ? 1 : 0),
          kill_count: row.kill_count + (decision === "KILL" ? 1 : 0),
        })
        .eq("id", row.id);
    }

    // STEP 69: cache invalidate
    analyticsCache.delete(data.game_id);

    res.json({ risk_score: risk, decision });
  } catch (e) {
    res.status(500).json({ error: "Decision API failed" });
  }
});

// ================= ANALYTICS READ (STEP 68–70) =================
app.get("/api/analytics/:game_id", async (req, res) => {
  const { game_id } = req.params;

  const cached = getCache(game_id);
  if (cached) return res.json(cached);

  const { data } = await supabase
    .from("daily_analytics")
    .select("*")
    .eq("game_id", game_id)
    .order("date", { ascending: false })
    .limit(7);

  // STEP 65: zero-data safety
  if (!data || data.length === 0) {
    return res.json({
      game_id,
      total_sessions: 0,
      avg_risk: 0,
      health: "ITERATE",
    });
  }

  const totalSessions = data.reduce((s, d) => s + d.total_sessions, 0);
  const avgRisk = Math.round(
    data.reduce((s, d) => s + d.avg_risk, 0) / data.length
  );

  let go = 0,
    iterate = 0,
    kill = 0;

  data.forEach((d) => {
    go += d.go_count;
    iterate += d.iterate_count;
    kill += d.kill_count;
  });

  // STEP 68: health logic
  let health = "ITERATE";
  if (go / totalSessions > 0.6 && avgRisk < 40) health = "GO";
  if (kill / totalSessions > 0.3 && avgRisk > 65) health = "KILL";

  const result = {
    game_id,
    days: data.length,
    total_sessions: totalSessions,
    avg_risk: avgRisk,
    go_percent: Math.round((go / totalSessions) * 100),
    iterate_percent: Math.round((iterate / totalSessions) * 100),
    kill_percent: Math.round((kill / totalSessions) * 100),
    health,
  };

  setCache(game_id, result);
  res.json(result);
});

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("LaunchSense running on", CONFIG.PORT);
});
