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

/* ------------------------------
   ANALYSIS ENGINE
--------------------------------*/
function analyzeGameplay(metrics) {
  const signals = [];
  let funRisk = 0;
  let retentionRisk = 0;
  let difficultyRisk = 0;

  if (metrics.avg_playtime < 8) {
    retentionRisk += 30;
    signals.push("Players leave too early");
  }

  if (metrics.early_quit_rate > 0.4) {
    retentionRisk += 25;
    signals.push("High early quit rate");
  }

  if (metrics.avg_deaths > 5) {
    difficultyRisk += 25;
    signals.push("Difficulty spike detected");
  }

  if (metrics.restart_rate > 0.35) {
    funRisk += 20;
    signals.push("Frequent restarts show frustration");
  }

  const risk = Math.min(funRisk + retentionRisk + difficultyRisk, 100);

  let decision = "GO";
  if (risk >= 40 && risk < 70) decision = "ITERATE";
  if (risk >= 70) decision = "KILL";

  return {
    risk,
    decision,
    primaryRisk:
      retentionRisk >= funRisk && retentionRisk >= difficultyRisk
        ? "retention"
        : difficultyRisk >= funRisk
        ? "difficulty"
        : "fun",
    signals,
  };
}

function calculateConfidence(metrics) {
  const p = Math.min(metrics.unique_players / 50, 1);
  const s = Math.min(metrics.total_sessions / 100, 1);
  return Number(((p + s) / 2).toFixed(2));
}

/* ------------------------------
   ANALYZE ENDPOINT (LOCK SAFE)
--------------------------------*/
app.post("/analyze", async (req, res) => {
  const { game_id } = req.body;
  if (!game_id) return res.status(400).json({ error: "game_id required" });

  // 1️⃣ Check kill-lock
  const { data: lastDecision } = await supabase
    .from("decisions")
    .select("*")
    .eq("game_id", game_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lastDecision?.locked) {
    return res.status(403).json({
      error: "This game is permanently killed. Re-analysis blocked.",
    });
  }

  // 2️⃣ Fetch gameplay data
  const { data, error } = await supabase
    .from("gameplay_metrics")
    .select("*")
    .eq("game_id", game_id);

  if (error || !data || data.length === 0) {
    return res.status(404).json({ error: "No gameplay data found" });
  }

  // 3️⃣ Aggregate metrics
  const total_sessions = data.length;
  const unique_players = new Set(data.map(d => d.player_id)).size;

  const avg_playtime =
    data.reduce((a, b) => a + b.playtime, 0) / total_sessions;

  const avg_deaths =
    data.reduce((a, b) => a + b.deaths, 0) / total_sessions;

  const restart_rate =
    data.filter(d => d.restarts > 0).length / total_sessions;

  const early_quit_rate =
    data.filter(d => d.early_quit === true).length / total_sessions;

  const metrics = {
    avg_playtime,
    avg_deaths,
    restart_rate,
    early_quit_rate,
    total_sessions,
    unique_players,
  };

  // 4️⃣ Analysis
  const analysis = analyzeGameplay(metrics);
  const confidence = calculateConfidence(metrics);

  // 5️⃣ Save decision
  const lock = analysis.decision === "KILL";

  await supabase.from("decisions").insert({
    game_id,
    risk_score: analysis.risk,
    decision: analysis.decision,
    confidence,
    locked: lock,
  });

  // 6️⃣ Response
  res.json({
    game_id,
    risk_score: analysis.risk,
    decision: analysis.decision,
    confidence,
    explanation: {
      primary_risk: analysis.primaryRisk,
      signals: analysis.signals,
    },
    locked: lock,
  });
});

/* ------------------------------
   HEALTH
--------------------------------*/
app.get("/", (_, res) => {
  res.send("LaunchSense Backend v2 running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("LaunchSense backend live on port", PORT);
});
