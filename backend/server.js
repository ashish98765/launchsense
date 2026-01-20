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
   ANALYSIS ENGINE
================================*/
function analyzeGameplay(metrics) {
  let funRisk = 0;
  let retentionRisk = 0;
  let difficultyRisk = 0;
  const signals = [];

  if (metrics.avg_playtime < 8) {
    retentionRisk += 30;
    signals.push("Low average playtime");
  }

  if (metrics.early_quit_rate > 0.4) {
    retentionRisk += 25;
    signals.push("High early quit rate");
  }

  if (metrics.avg_deaths > 5) {
    difficultyRisk += 25;
    signals.push("Difficulty spike");
  }

  if (metrics.restart_rate > 0.35) {
    funRisk += 20;
    signals.push("Player frustration detected");
  }

  const risk = Math.min(funRisk + retentionRisk + difficultyRisk, 100);

  let decision = "GO";
  if (risk >= 40 && risk < 70) decision = "ITERATE";
  if (risk >= 70) decision = "KILL";

  const primaryRisk =
    retentionRisk >= funRisk && retentionRisk >= difficultyRisk
      ? "retention"
      : difficultyRisk >= funRisk
      ? "difficulty"
      : "fun";

  return { risk, decision, primaryRisk, signals };
}

/* ===============================
   CONFIDENCE
================================*/
function calculateConfidence(metrics) {
  const p = Math.min(metrics.unique_players / 50, 1);
  const s = Math.min(metrics.total_sessions / 100, 1);
  return Number(((p + s) / 2).toFixed(2));
}

/* ===============================
   SUGGESTIONS
================================*/
function generateSuggestions(primaryRisk, decision) {
  const s = [];

  if (primaryRisk === "retention")
    s.push(
      "Improve onboarding clarity",
      "Shorten first-session duration",
      "Add early progression reward"
    );

  if (primaryRisk === "difficulty")
    s.push(
      "Flatten early difficulty curve",
      "Add checkpoints",
      "Reduce early enemy damage"
    );

  if (primaryRisk === "fun")
    s.push(
      "Improve feedback (VFX/SFX)",
      "Strengthen core loop",
      "Reduce gameplay friction"
    );

  if (decision === "GO")
    s.unshift(
      "Scale playtest to 50–100 users",
      "Track D1/D3 retention"
    );

  if (decision === "KILL")
    s.push(
      "Stop further investment",
      "Salvage mechanics",
      "Document learnings"
    );

  return s;
}

/* ===============================
   TREND ENGINE (NEW)
================================*/
function analyzeTrend(currentRisk, previousRisk) {
  if (previousRisk === null) {
    return { direction: "no_history", delta: 0 };
  }

  const delta = previousRisk - currentRisk;

  let direction = "stagnant";
  if (delta >= 10) direction = "strong_improvement";
  else if (delta >= 3) direction = "mild_improvement";
  else if (delta <= -3) direction = "degrading";

  return { direction, delta };
}

/* ===============================
   BENCHMARK (SOFT)
================================*/
function benchmarkBand(risk) {
  if (risk < 30) return "top_tier";
  if (risk < 55) return "average";
  return "high_risk";
}

/* ===============================
   ANALYZE API
================================*/
app.post("/analyze", async (req, res) => {
  const { game_id } = req.body;
  if (!game_id) return res.status(400).json({ error: "game_id required" });

  const { data: lastDecision } = await supabase
    .from("decisions")
    .select("*")
    .eq("game_id", game_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lastDecision?.locked) {
    return res.status(403).json({ error: "Game permanently killed" });
  }

  const { data } = await supabase
    .from("gameplay_metrics")
    .select("*")
    .eq("game_id", game_id);

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "No gameplay data" });
  }

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

  const analysis = analyzeGameplay(metrics);
  const confidence = calculateConfidence(metrics);
  const suggestions = generateSuggestions(
    analysis.primaryRisk,
    analysis.decision
  );

  const trend = analyzeTrend(
    analysis.risk,
    lastDecision?.risk_score ?? null
  );

  const benchmark = benchmarkBand(analysis.risk);
  const locked = analysis.decision === "KILL";

  await supabase.from("decisions").insert({
    game_id,
    risk_score: analysis.risk,
    decision: analysis.decision,
    confidence,
    locked,
  });

  res.json({
    game_id,
    risk_score: analysis.risk,
    decision: analysis.decision,
    confidence,
    trend,
    benchmark,
    explanation: {
      primary_risk: analysis.primaryRisk,
      signals: analysis.signals,
    },
    suggestions,
    locked,
  });
});

/* ===============================
   HEALTH
================================*/
app.get("/", (_, res) => {
  res.send("LaunchSense Backend v4 running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("LaunchSense backend live on port", PORT);
});
