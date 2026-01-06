const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route (bahut important for Render)
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// Port (Render yahin se pick karta hai)
const PORT = process.env.PORT || 3001;

// Server start
app.listen(PORT, () => {
  console.log(`LaunchSense backend listening on port ${PORT}`);
});
