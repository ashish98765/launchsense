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
   ROOT CHECK
========================= */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* =========================
   SIGNUP API (DB CONNECTED)
========================= */
app.post("/signup", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required"
      });
    }

    const { data, error } = await supabase
      .from("launchsense")
      .insert([{ email }]);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({
        success: false,
        error: "Database insert failed"
      });
    }

    return res.json({
      success: true,
      message: "Signup successful",
      data
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/* =========================
   DECISION API
========================= */
app.post("/api/decision", (req, res) => {
  try {
    const metrics = req.body;

    if (
      metrics.playtime === undefined ||
      metrics.deaths === undefined ||
      metrics.restarts === undefined ||
      metrics.earlyQuit === undefined
    ) {
      return res.status(400).json({
        error: "Invalid gameplay data"
      });
    }

    const riskScore = calculateRiskScore(metrics);
    const decision = getDecision(riskScore);

    res.json({
      riskScore,
      decision
    });

  } catch (error) {
    console.error("Decision error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
