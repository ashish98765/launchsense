const express = require("express");
const cors = require("cors");
require("dotenv").config();

const healthRoutes = require("./routes/health");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());

/* =====================
   ROOT HEALTH CHECK
===================== */
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

/* =====================
   ROUTES
===================== */
app.use("/api", healthRoutes);

/* =====================
   DECISION API
===================== */
/*
Expected body:
{
  playtime: number,
  deaths: number,
  restarts: number,
  earlyQuit: boolean
}
*/
app.post("/api/decision", (req, res) => {
  try {
    const metrics = req.body;

    // basic validation
    if (
      metrics.playtime === undefined ||
      metrics.deaths === undefined ||
      metrics.restarts === undefined ||
      metrics.earlyQuit === undefined
    ) {
      return res.status(400).json({ error: "Invalid gameplay data" });
    }

    const riskScore = calculateRiskScore(metrics);
    const decision = getDecision(riskScore);

    res.json({
      riskScore,
      decision
    });
  } catch (error) {
    console.error("Decision error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =====================
   SERVER START
===================== */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`LaunchSense backend running on port ${PORT}`);
});
