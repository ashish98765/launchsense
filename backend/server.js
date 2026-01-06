const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

/* ======================
   SUPABASE SETUP
====================== */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/* ======================
   ROOT CHECK
====================== */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* ======================
   SIGNUP API
====================== */
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
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ======================
   GAME DECISION API
====================== */
app.post("/api/decision", async (req, res) => {
  try {
    const {
      gameId,
      playerId,
      sessionId,
      playtime,
      deaths,
      restarts,
      earlyQuit,
    } = req.body;

    if (
      !gameId ||
      !playerId ||
      !sessionId ||
      playtime === undefined ||
      deaths === undefined ||
      restarts === undefined ||
      earlyQuit === undefined
    ) {
      return res.status(400).json({
        error: "Invalid gameplay data",
      });
    }

    const riskScore = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit,
    });

    const decision = getDecision(riskScore);

    // 🔥 SAVE GAME SESSION
    const { error } = await supabase.from("game_sessions").insert([
      {
        game_id: gameId,
        player_id: playerId,
        session_id: sessionId,
        playtime,
        deaths,
        restarts,
        early_quit: earlyQuit,
        risk_score: riskScore,
        decision,
      },
    ]);

    if (error) {
      console.error("Game session insert error:", error);
      return res.status(500).json({ error: "Failed to save session" });
    }

    res.json({
      riskScore,
      decision,
    });
  } catch (err) {
    console.error("Decision API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
