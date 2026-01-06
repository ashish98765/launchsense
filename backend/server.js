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
   ROOT HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* ======================
   SIGNUP API (POST)
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

    const { data, error } = await supabase
      .from("launchsense")
      .insert([{ email }]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({
        success: false,
        error: "Database insert failed",
      });
    }

    return res.json({
      success: true,
      message: "Signup successful",
      data,
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/* ======================
   TEST SIGNUP (BROWSER)
   /test-signup?email=test@x.com
====================== */
app.get("/test-signup", async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.json({ error: "email missing" });
  }

  const { data, error } = await supabase
    .from("launchsense")
    .insert([{ email }]);

  if (error) {
    console.error(error);
    return res.json({ error });
  }

  res.json({
    success: true,
    message: "Email inserted",
    data,
  });
});

/* ======================
   GAME DECISION API
====================== */
app.post("/api/decision", (req, res) => {
  try {
    const { playtime, deaths, restarts, earlyQuit } = req.body;

    if (
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

    res.json({
      riskScore,
      decision,
    });
  } catch (error) {
    console.error("Decision error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

/* ======================
   SESSION-BASED GAME API
   (PHASE 3 BASE)
====================== */
app.post("/api/session", (req, res) => {
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
        error: "Invalid session payload",
      });
    }

    const riskScore = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit,
    });

    const decision = getDecision(riskScore);

    res.json({
      gameId,
      playerId,
      sessionId,
      riskScore,
      decision,
    });
  } catch (err) {
    console.error("Session error:", err);
    res.status(500).json({
      error: "Session processing failed",
    });
  }
});

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
