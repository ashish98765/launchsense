// backend/server.js
// LaunchSense Backend – FINAL CLEAN VERSION

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();

/* ===============================
   MIDDLEWARE
================================ */
app.use(cors());
app.use(express.json());

/* ===============================
   SUPABASE SETUP
================================ */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* ===============================
   CREATE PROJECT
================================ */
app.post("/api/projects", async (req, res) => {
  try {
    const { user_id, name } = req.body;

    if (!user_id || !name) {
      return res.status(400).json({ error: "user_id and name required" });
    }

    const game_id = "game_" + Date.now();

    const { data, error } = await supabase
      .from("projects")
      .insert([{ user_id, name, game_id }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      project: data
    });
  } catch (err) {
    res.status(500).json({ error: "Project creation failed" });
  }
});

/* ===============================
   LIST PROJECTS (IMPORTANT)
================================ */
app.get("/api/projects", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("game_id, name, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      projects: data
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

/* ===============================
   SESSION DECISION API
================================ */
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

    if (!game_id || !player_id || !session_id) {
      return res.status(400).json({ error: "Missing identifiers" });
    }

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
  } catch (err) {
    res.status(500).json({ error: "Decision API failed" });
  }
});

/* ===============================
   GAME ANALYTICS
================================ */
app.get("/api/analytics/game/:game_id", async (req, res) => {
  try {
    const { game_id } = req.params;

    const { data } = await supabase
      .from("game_sessions")
      .select("decision, risk_score")
      .eq("game_id", game_id);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No sessions found" });
    }

    let go = 0,
      iterate = 0,
      kill = 0,
      riskSum = 0;

    data.forEach((s) => {
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
  } catch (err) {
    res.status(500).json({ error: "Analytics failed" });
  }
});

/* ===============================
   PLAYER TREND
================================ */
app.get("/api/analytics/player/:player_id/trend", async (req, res) => {
  try {
    const { player_id } = req.params;

    const { data } = await supabase
      .from("game_sessions")
      .select("risk_score, created_at")
      .eq("player_id", player_id)
      .order("created_at", { ascending: true })
      .limit(10);

    if (!data || data.length < 4) {
      return res.status(400).json({ error: "Not enough data" });
    }

    const mid = Math.floor(data.length / 2);

    const avg = (arr) =>
      Math.round(arr.reduce((s, x) => s + x.risk_score, 0) / arr.length);

    const firstAvg = avg(data.slice(0, mid));
    const secondAvg = avg(data.slice(mid));

    const diff = secondAvg - firstAvg;

    let trend = "STABLE";
    if (diff < -5) trend = "IMPROVING";
    if (diff > 5) trend = "DEGRADING";

    res.json({
      player_id,
      trend,
      risk_change: diff
    });
  } catch (err) {
    res.status(500).json({ error: "Trend analysis failed" });
  }
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LaunchSense backend running on ${PORT}`);
});
