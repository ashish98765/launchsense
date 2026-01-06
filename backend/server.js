// backend/server.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());

/* =====================
   SUPABASE SETUP
===================== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* =====================
   ROOT HEALTH CHECK
===================== */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* =====================
   SIGNUP API
===================== */
app.post("/signup", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const { error } = await supabase
      .from("launchsense")
      .insert([{ email }]);

    if (error) {
      console.error("Signup insert error:", error);
      return res.status(500).json({
        success: false,
        error: "Database insert failed",
      });
    }

    res.json({
      success: true,
      message: "Signup successful",
    });
  } catch (err) {
    console.error("Signup server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   GAME SESSION + DECISION API
===================== */
app.post("/api/decision", async (req, res) => {
  try {
    const {
      game_id,
      player_id,
      session_id,
      playtime,
      deaths,
      restarts,
      early_quit,
    } = req.body;

    /* ---------- REQUIRED CHECK ---------- */
    if (!game_id || !player_id || !session_id) {
      return res.status(400).json({
        error: "Missing required identifiers",
      });
    }

    /* ---------- TYPE & RANGE VALIDATION ---------- */
    if (
      typeof playtime !== "number" || playtime < 0 ||
      typeof deaths !== "number" || deaths < 0 ||
      typeof restarts !== "number" || restarts < 0 ||
      typeof early_quit !== "boolean"
    ) {
      return res.status(400).json({
        error: "Invalid gameplay data types or values",
      });
    }

    /* ---------- DUPLICATE SESSION CHECK ---------- */
    const { data: existingSession, error: fetchError } =
      await supabase
        .from("game_sessions")
        .select("risk_score, decision")
        .eq("game_id", game_id)
        .eq("player_id", player_id)
        .eq("session_id", session_id)
        .maybeSingle();

    if (fetchError) {
      console.error("Session fetch error:", fetchError);
      return res.status(500).json({
        error: "Session lookup failed",
      });
    }

    if (existingSession) {
      return res.json({
        success: true,
        risk_score: existingSession.risk_score,
        decision: existingSession.decision,
        duplicate: true,
      });
    }

    /* ---------- RISK CALCULATION ---------- */
    const risk_score = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit: early_quit,
    });

    const decision = getDecision(risk_score);

    /* ---------- SAVE SESSION ---------- */
    const { error: insertError } = await supabase
      .from("game_sessions")
      .insert([
        {
          game_id,
          player_id,
          session_id,
          playtime,
          deaths,
          restarts,
          early_quit,
          risk_score,
          decision,
        },
      ]);

    if (insertError) {
      console.error("Game session insert error:", insertError);
      return res.status(500).json({
        error: "Failed to save game session",
      });
    }

    /* ---------- SUCCESS RESPONSE ---------- */
    return res.json({
      success: true,
      risk_score,
      decision,
      duplicate: false,
    });
  } catch (err) {
    console.error("Decision API crash:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   STEP 29 — DECISION HISTORY API
===================== */
app.get("/api/decisions/history", async (req, res) => {
  try {
    const { game_id, player_id, limit = 10 } = req.query;

    if (!game_id) {
      return res.status(400).json({
        error: "game_id is required",
      });
    }

    let query = supabase
      .from("game_sessions")
      .select(
        "session_id, player_id, risk_score, decision, created_at"
      )
      .eq("game_id", game_id)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (player_id) {
      query = query.eq("player_id", player_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("History fetch error:", error);
      return res.status(500).json({
        error: "Failed to fetch history",
      });
    }

    res.json({
      success: true,
      count: data.length,
      sessions: data,
    });
  } catch (err) {
    console.error("History API crash:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   DEBUG DECISION API (BROWSER TEST)
===================== */
app.get("/debug-decision", (req, res) => {
  try {
    const playtime = Number(req.query.playtime || 1200);
    const deaths = Number(req.query.deaths || 2);
    const restarts = Number(req.query.restarts || 1);
    const earlyQuit = req.query.earlyQuit === "true";

    const risk_score = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit,
    });

    const decision = getDecision(risk_score);

    res.json({ risk_score, decision });
  } catch (err) {
    console.error("Debug decision error:", err);
    res.status(500).json({ error: "Debug failed" });
  }
});

/* =====================
   SERVER START
===================== */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
