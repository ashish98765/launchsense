// LaunchSense Backend — Phase 2 Batch-2 (Trends + Momentum)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
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

const CONFIG = {
  PORT: process.env.PORT || 3000,
  VERSION: "1.3.0-trends",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
};

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "200kb" }));
app.use(timeout("10s"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use((req, res, next) => {
  req.req_id = crypto.randomUUID();
  req._start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - req._start;
    if (ms > 1500) console.warn("SLOW", req.path, ms);
  });
  next();
});

/* ================= SUPABASE ================= */
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* ================= HELPERS ================= */
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, c, m) => res.status(c).json({ success: false, error: m });

/* ================= VERSIONED API ================= */
const v1 = express.Router();
app.use("/v1", v1);

/* ================= HEALTH ================= */
v1.get("/", (_, res) =>
  ok(res, { status: "live", version: CONFIG.VERSION })
);

/* ================= API AUTH ================= */
async function apiAuth(req, res, next) {
  const api_key = req.headers["x-api-key"];
  const game_id = req.headers["x-game-id"];
  if (!api_key || !game_id) return fail(res, 401, "Missing API key");

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");
  req.game_id = game_id;
  next();
}

/* ================= INTELLIGENCE ================= */
function buildSignals({ playtime = 0, deaths = 0, restarts = 0, early_quit }) {
  return {
    engagement: Math.min(playtime / 600, 1),
    frustration: Math.min((deaths * 2 + restarts) / 10, 1),
    early_quit: early_quit ? 1 : 0,
  };
}

function decide(signals) {
  const risk =
    (1 - signals.engagement) * 0.4 +
    signals.frustration * 0.4 +
    signals.early_quit * 0.2;

  let decision = "ITERATE";
  if (risk < 0.35) decision = "GO";
  if (risk > 0.65) decision = "KILL";

  return {
    risk_score: Math.round(risk * 100),
    decision,
    confidence: Math.round((1 - Math.abs(0.5 - risk)) * 100) / 100,
    signals,
  };
}

/* ================= DAILY AGGREGATION ================= */
async function aggregateDaily(game_id, today, decision, risk) {
  const { data: row } = await supabase
    .from("daily_analytics")
    .select("*")
    .eq("game_id", game_id)
    .eq("date", today)
    .maybeSingle();

  if (!row) {
    await supabase.from("daily_analytics").insert({
      game_id,
      date: today,
      total_sessions: 1,
      avg_risk: risk,
      go_count: decision === "GO" ? 1 : 0,
      iterate_count: decision === "ITERATE" ? 1 : 0,
      kill_count: decision === "KILL" ? 1 : 0,
    });
  } else {
    const total = row.total_sessions + 1;
    await supabase
      .from("daily_analytics")
      .update({
        total_sessions: total,
        avg_risk: Math.round(
          (row.avg_risk * row.total_sessions + risk) / total
        ),
        go_count: row.go_count + (decision === "GO"),
        iterate_count: row.iterate_count + (decision === "ITERATE"),
        kill_count: row.kill_count + (decision === "KILL"),
      })
      .eq("id", row.id);
  }
}

/* ================= DECISION API ================= */
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const signals = buildSignals(req.body);
    const result = decide(signals);
    const today = new Date().toISOString().slice(0, 10);

    await supabase.from("game_sessions").insert({
      game_id: req.game_id,
      ...req.body,
      risk_score: result.risk_score,
      decision: result.decision,
      confidence: result.confidence,
      signals,
    });

    await aggregateDaily(
      req.game_id,
      today,
      result.decision,
      result.risk_score
    );

    ok(res, result);
  } catch (e) {
    console.error(e);
    fail(res, 500, "Decision failed");
  }
});

/* ================= ANALYTICS (7/30 DAY + MOMENTUM) ================= */
v1.get("/analytics/:game_id", async (req, res) => {
  const { game_id } = req.params;

  const { data } = await supabase
    .from("daily_analytics")
    .select("*")
    .eq("game_id", game_id)
    .order("date", { ascending: false })
    .limit(30);

  if (!data || data.length === 0) {
    return ok(res, {
      game_id,
      health: "ITERATE",
      trend: "flat",
      momentum: 0,
      avg_risk_7d: 0,
      avg_risk_30d: 0,
      total_sessions: 0,
    });
  }

  const last7 = data.slice(0, 7);
  const avg7 =
    last7.reduce((s, d) => s + d.avg_risk, 0) / last7.length;

  const avg30 =
    data.reduce((s, d) => s + d.avg_risk, 0) / data.length;

  const momentum = Math.round((avg30 - avg7) * -1); // positive = improving

  let trend = "flat";
  if (momentum > 5) trend = "accelerating";
  if (momentum < -5) trend = "slowing";

  const avgRisk = Math.round(avg7);

  ok(res, {
    game_id,
    days_tracked: data.length,
    total_sessions: data.reduce((s, d) => s + d.total_sessions, 0),
    avg_risk_7d: Math.round(avg7),
    avg_risk_30d: Math.round(avg30),
    momentum,
    trend,
    health: avgRisk < 40 ? "GO" : avgRisk > 65 ? "KILL" : "ITERATE",
  });
});

/* ================= START ================= */
app.listen(CONFIG.PORT, () => {
  console.log(`LaunchSense ${CONFIG.VERSION} running on`, CONFIG.PORT);
});
