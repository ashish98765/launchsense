import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ===============================
   CORE ANALYSIS
================================*/
function analyzeGameplay(m) {
  let fun = 0, retention = 0, difficulty = 0;
  const signals = [];

  if (m.avg_playtime < 8) {
    retention += 30; signals.push("Low playtime");
  }
  if (m.early_quit_rate > 0.4) {
    retention += 25; signals.push("High early quit");
  }
  if (m.avg_deaths > 5) {
    difficulty += 25; signals.push("Difficulty spike");
  }
  if (m.restart_rate > 0.35) {
    fun += 20; signals.push("Frustration detected");
  }

  const risk = Math.min(fun + retention + difficulty, 100);

  let decision = "GO";
  if (risk >= 40) decision = "ITERATE";
  if (risk >= 70) decision = "KILL";

  const primary =
    retention >= difficulty && retention >= fun
      ? "retention"
      : difficulty >= fun
      ? "difficulty"
      : "fun";

  return { risk, decision, primary, signals };
}

/* ===============================
   CONFIDENCE
================================*/
function confidence(m) {
  return Number(
    Math.min(
      (m.unique_players / 50 + m.total_sessions / 100) / 2,
      1
    ).toFixed(2)
  );
}

/* ===============================
   TREND
================================*/
function trend(current, previous) {
  if (previous === null) return { direction: "none", delta: 0 };
  const delta = previous - current;

  if (delta >= 10) return { direction: "strong_improvement", delta };
  if (delta >= 3) return { direction: "mild_improvement", delta };
  if (delta <= -3) return { direction: "degrading", delta };
  return { direction: "stagnant", delta };
}

/* ===============================
   PREDICTION (NEW)
================================*/
function predict(risk, trendDir) {
  let next1 = risk;
  let next2 = risk;

  if (trendDir === "degrading") {
    next1 += 8;
    next2 += 15;
  }
  if (trendDir.includes("improvement")) {
    next1 -= 6;
    next2 -= 12;
  }

  return {
    next_iteration: Math.min(next1, 100),
    two_iterations: Math.min(next2, 100),
  };
}

/* ===============================
   KILL WARNING
================================*/
function killWarning(risk, prediction) {
  if (risk >= 70) return "KILL_LOCK";
  if (prediction.next_iteration >= 70) return "FINAL_WARNING";
  if (prediction.next_iteration >= 60) return "WARNING";
  return "NONE";
}

/* ===============================
   SUGGESTIONS
================================*/
function suggestions(primary, warning) {
  const s = [];

  if (primary === "retention")
    s.push("Improve onboarding", "Shorten early loop");
  if (primary === "difficulty")
    s.push("Reduce early difficulty", "Add checkpoints");
  if (primary === "fun")
    s.push("Improve feedback", "Reduce friction");

  if (warning === "FINAL_WARNING")
    s.unshift("⚠️ Last safe iteration remaining");

  return s;
}

/* ===============================
   ANALYZE ENDPOINT
================================*/
app.post("/analyze", async (req, res) => {
  const { game_id } = req.body;
  if (!game_id) return res.status(400).json({ error: "game_id required" });

  const { data: last } = await supabase
    .from("decisions")
    .select("*")
    .eq("game_id", game_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (last?.locked)
    return res.status(403).json({ error: "Game permanently killed" });

  const { data } = await supabase
    .from("gameplay_metrics")
    .select("*")
    .eq("game_id", game_id);

  if (!data?.length)
    return res.status(404).json({ error: "No gameplay data" });

  const total_sessions = data.length;
  const unique_players = new Set(data.map(d => d.player_id)).size;

  const metrics = {
    avg_playtime: data.reduce((a, b) => a + b.playtime, 0) / total_sessions,
    avg_deaths: data.reduce((a, b) => a + b.deaths, 0) / total_sessions,
    restart_rate: data.filter(d => d.restarts > 0).length / total_sessions,
    early_quit_rate: data.filter(d => d.early_quit).length / total_sessions,
    total_sessions,
    unique_players,
  };

  const a = analyzeGameplay(metrics);
  const c = confidence(metrics);
  const t = trend(a.risk, last?.risk_score ?? null);
  const p = predict(a.risk, t.direction);
  const w = killWarning(a.risk, p);

  const locked = a.decision === "KILL";

  await supabase.from("decisions").insert({
    game_id,
    risk_score: a.risk,
    decision: a.decision,
    confidence: c,
    locked,
  });

  res.json({
    game_id,
    risk_score: a.risk,
    decision: a.decision,
    confidence: c,
    trend: t,
    prediction: p,
    kill_warning: w,
    explanation: {
      primary_risk: a.primary,
      signals: a.signals,
    },
    suggestions: suggestions(a.primary, w),
    executive_summary: `Current risk is ${a.risk}. Trend is ${t.direction}. If no major fixes are applied, risk may reach ${p.next_iteration} in next iteration.`,
    locked,
  });
});

/* ===============================
   HEALTH
================================*/
app.get("/", (_, res) => {
  res.send("LaunchSense Backend v5 — Predictive System Live");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("LaunchSense backend running on", PORT)
);
