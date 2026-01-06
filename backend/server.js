const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   SUPABASE SETUP
========================= */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* =========================
   ROOT HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* =========================
   SIGNUP API
========================= */
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

/* =========================
   GAME SESSION + DECISION API
========================= */
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

    if (
      !game_id ||
      !player_id ||
      !session_id ||
      playtime === undefined ||
      deaths === undefined ||
      restarts === undefined ||
      early_quit === undefined
    ) {
      return res.status(400).json({
        error: "Invalid gameplay data",
      });
    }

    /* ---- Risk calculation ---- */
    const risk_score = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit: early_quit,
    });

    /* ---- Decision engine ---- */
    const decision = getDecision(risk_score);

    /* ---- Save session ---- */
    const { error } = await supabase
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

    if (error) {
      console.error("Game session insert error:", error);
      return res.status(500).json({
        error: "Failed to save game session",
      });
    }

    res.json({
      success: true,
      risk_score,
      decision,
    });
  } catch (err) {
    console.error("Decision API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =========================
   DEBUG GET API (BROWSER TEST)
========================= */
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

    res.json({
      risk_score,
      decision,
    });
  } catch (err) {
    console.error("Debug decision error:", err);
    res.status(500).json({ error: "Debug failed" });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
