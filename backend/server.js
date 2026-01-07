// ===============================
// LaunchSense Backend - FINAL
// ===============================

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// SUPABASE SETUP
// ===============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ===============================
// HEALTH CHECK
// ===============================
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// ===============================
// SIGNUP
// ===============================
app.post("/signup", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const { error } = await supabase
      .from("launchsense")
      .insert([{ email }]);

    if (error) throw error;
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Signup failed" });
  }
});

// ===============================
// CREATE PROJECT
// ===============================
app.post("/api/project", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Project name required" });

    const game_id = "game_" + Date.now();

    const { error } = await supabase
      .from("projects")
      .insert([{ game_id, name }]);

    if (error) throw error;

    res.json({ success: true, game_id });
  } catch {
    res.status(500).json({ error: "Project creation failed" });
  }
});

// ===============================
// SESSION DECISION API
// ===============================
app.post("/api/decision", async (req, res) => {
  try {
    const {
      game_id,
      player_id,
      session_id,
      playtime,
      deaths,
      restarts,
      early_quit
    } = req.body;

    if (!game_id || !player_id || !session_id)
      return res.status(400).json({ error: "Missing identifiers" });

    if (
      typeof playtime !== "number" ||
      typeof deaths !== "number" ||
      typeof restarts !== "number" ||
      typeof early_quit !== "boolean"
    ) {
      return res.status(400).json({ error: "Invalid data types" });
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from("game_sessions")
      .select("risk_score, decision")
      .eq("game_id", game_id)
      .eq("player_id", player_id)
      .eq("session_id", session_id)
      .maybeSingle();

    if (existing) {
      return res.json({
        success: true,
        risk_score: existing.risk_score,
        decision: existing.decision,
        duplicate: true
      });
    }

    const risk_score = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit: early_quit
    });

    const decision = getDecision(risk_score);

    await supabase.from("game_sessions").insert([
      {
        game_id,
        player_id,
        session_id,
        playtime,
        deaths,
        restarts,
        early_quit,
        risk_score,
        decision
      }
    ]);

    res.json({
      success: true,
      risk_score,
      decision,
      duplicate: false
    });
  } catch {
    res.status(500).json({ error: "Decision API failed" });
  }
});

// ===============================
// GAME ANALYTICS
// ===============================
app.get("/api/analytics/game/:game_id", async (req, res) => {
  try {
    const { game_id } = req.params;

    const { data } = await supabase
      .from("game_sessions")
      .select("decision, risk_score")
      .eq("game_id", game_id);

    if (!data || data.length === 0)
      return res.status(404).json({ error: "No sessions found" });

    let go = 0, iterate = 0, kill = 0, riskSum = 0;

    data.forEach(s => {
      riskSum += s.risk_score;
      if (s.decision === "GO") go++;
      else if (s.decision === "ITERATE") iterate++;
      else kill++;
    });

    const total = data.length;
    const avgRisk = Math.round(riskSum / total);

    let health = "ITERATE";
    if (go / total > 0.6 && avgRisk < 40) health = "GO";
    if (kill / total > 0.3 && avgRisk > 65) health = "KILL";

    res.json({
      game_id,
      total_sessions: total,
      go_percent: Math.round((go / total) * 100),
      iterate_percent: Math.round((iterate / total) * 100),
      kill_percent: Math.round((kill / total) * 100),
      average_risk: avgRisk,
      health
    });
  } catch {
    res.status(500).json({ error: "Analytics failed" });
  }
});

// ===============================
// PLAYER TREND
// ===============================
app.get("/api/analytics/player/:player_id/trend", async (req, res) => {
  try {
    const { player_id } = req.params;

    const { data } = await supabase
      .from("game_sessions")
      .select("risk_score, created_at")
      .eq("player_id", player_id)
      .order("created_at", { ascending: true })
      .limit(10);

    if (!data || data.length < 4)
      return res.status(400).json({ error: "Not enough data" });

    const mid = Math.floor(data.length / 2);
    const avg = arr =>
      Math.round(arr.reduce((s, x) => s + x.risk_score, 0) / arr.length);

    const firstAvg = avg(data.slice(0, mid));
    const secondAvg = avg(data.slice(mid));
    const diff = secondAvg - firstAvg;

    let trend = "STABLE";
    if (diff < -5) trend = "IMPROVING";
    else if (diff > 5) trend = "DEGRADING";

    let confidence = "LOW";
    if (Math.abs(diff) > 10) confidence = "HIGH";
    else if (Math.abs(diff) > 5) confidence = "MEDIUM";

    res.json({
      player_id,
      trend,
      risk_change: diff,
      confidence
    });
  } catch {
    res.status(500).json({ error: "Trend analysis failed" });
  }
});

// ===============================
// SERVER START
// ===============================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`LaunchSense backend running on ${PORT}`)
);
