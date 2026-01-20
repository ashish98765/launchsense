// server.js
// Batch 1 integrated: Decision Explanation Layer

const express = require("express");
const cors = require("cors");
const { calculateDecision } = require("./decisionEngine");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// MAIN decision endpoint (same as before, richer response)
app.post("/analyze", (req, res) => {
  try {
    const metrics = req.body;

    if (!metrics) {
      return res.status(400).json({ error: "Metrics payload missing" });
    }

    const result = calculateDecision(metrics);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Decision error:", error);
    return res.status(500).json({ error: "Decision engine failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LaunchSense server running on port ${PORT}`);
});
