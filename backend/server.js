import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// Supabase Setup
// --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --------------------
// Utility: Risk Analysis
// --------------------
function analyzeGameplay(metrics) {
  const signals = [];

  let risk = 0;
  let funRisk = 0;
  let retentionRisk = 0;
  let difficultyRisk = 0;

  if (metrics.avg_playtime < 8) {
    retentionRisk += 30;
    signals.push("Players are quitting too early in the session");
  }

  if (metrics.early_quit_rate > 0.4) {
    retentionRisk += 25;
    signals.push("High early quit rate detected");
  }

  if (metrics.avg_deaths > 5) {
    difficultyRisk += 25;
    signals.push("Difficulty spike detected due to high deaths");
  }

  if (metrics.restart_rate > 0.35) {
    funRisk += 20;
    signals.push("Restart rate indicates player frustration");
  }

  risk = Math.min(funRisk + retentionRisk + difficultyRisk, 100);

  let decision = "GO";
  if (risk >= 40 && risk < 70) decision = "ITERATE";
  if (risk >= 70) decision = "KILL";

  let primaryRisk = "fun";
  if (retentionRisk >= funRisk && retentionRisk >= difficultyRisk)
    primaryRisk = "retention";
  else if (difficultyRisk >= funRisk)
    primaryRisk = "difficulty";

  let secondaryRisk =
    primaryRisk === "fun"
      ? "retention"
      : primaryRisk === "retention"
      ? "difficulty"
      : "fun";

  return {
    risk,
    decision,
    primaryRisk,
    secondaryRisk,
    signals,
  };
}

// --------------------
// Utility: Confidence Score
// --------------------
function calculateConfidence(metrics) {
  let playerScore = Math.min(metrics.unique_players / 50, 1);
  let sessionScore = Math.min(metrics.total_sessions / 100, 1);
  let stabilityScore =
    metrics.avg_playtime > 0 && metrics.playtime_variance < 15 ? 1 : 0.6;

  const confidence = (
    (playerScore + sessionScore + stabilityScore) /
    3
  ).toFixed(2);

  return Number(confidence);
}

// --------------------
// API: Analyze Game
// --------------------
app.post("/analyze", async (req, res) => {
  try {
    const { game_id } = req.body;

    if (!game_id) {
      return res.status(400).json({ error: "game_id is required" });
    }

    const { data, error } = await supabase
      .from("gameplay_metrics")
      .select("*")
      .eq("game_id", game_id);

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "No gameplay data found" });
    }

    // Aggregate metrics
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

    const playtimes = data.map(d => d.playtime);
    const mean = avg_playtime;
    const variance =
      playtimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      playtimes.length;

    const metrics = {
      avg_playtime,
      avg_deaths,
      restart_rate,
      early_quit_rate,
      total_sessions,
      unique_players,
      playtime_variance: variance,
    };

    const analysis = analyzeGameplay(metrics);
    const confidence = calculateConfidence(metrics);

    const response = {
      game_id,
      risk_score: analysis.risk,
      decision: analysis.decision,
      confidence,
      explanation: {
        primary_risk: analysis.primaryRisk,
        secondary_risk: analysis.secondaryRisk,
        signals: analysis.signals,
      },
    };

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// Health Check
// --------------------
app.get("/", (_, res) => {
  res.send("LaunchSense Backend is running");
});

// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
