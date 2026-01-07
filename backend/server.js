// LaunchSense Backend – FINAL STABLE (with DEMO)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();
app.use(cors());
app.use(express.json());

// ================= SUPABASE =================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ================= HELPERS =================
function generateApiKey() {
  return "ls_" + crypto.randomBytes(24).toString("hex");
}

async function verifyApiKey(game_id, api_key) {
  if (!game_id || !api_key) return false;

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();

  return !!data;
}

// ================= MIDDLEWARE =================
async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const gameId = req.headers["x-game-id"];

  const valid = await verifyApiKey(gameId, apiKey);
  if (!valid) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}

// ================= HEALTH =================
app.get("/", (req, res) => {
  res.json({ status: "LaunchSense backend running" });
});

// ================= DEMO ANALYTICS (PUBLIC) =================
app.get("/api/demo/analytics", (req, res) => {
  res.json({
    demo: true,
    game_id: "demo_game_001",
    total_sessions: 42,
    average_risk: 38,
    go_percent: 57,
    iterate_percent: 33,
    kill_percent: 10,
    health: "GO"
  });
});

// ================= CREATE PROJECT =================
app.post("/api/projects", async (req, res) => {
  try {
    const { user_id, name } = req.body;
    if (!user_id || !name) {
      return res.status(400).json({ error: "user_id and name required" });
    }

    const game_id = "game_" + Date.now();
    const api_key = generateApiKey();

    const { data, error } = await supabase
      .from("projects")
      .insert([{ user_id, name, game_id }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from("api_keys").insert({
      game_id,
      api_key,
      revoked: false
    });

    res.json({ success: true, project: data, api_key });
  } catch {
    res.status(500).json({ error: "Project creation failed" });
  }
});

// ================= LIST PROJECTS =================
app.get("/api/projects", async (req, res) => {
  try {
    const { data } = await supabase
      .from("projects")
      .select("game_id, name, created_at")
      .order("created_at", { ascending: false });

    res.json({ success: true, projects: data });
  } catch {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ================= REVOKE API KEY =================
app.post("/api/api-keys/revoke", async (req, res) => {
  try {
    const { game_id } = req.body;
    if (!game_id) {
      return res.status(400).json({ error: "game_id required" });
    }

    await supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("game_id", game_id);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

// ================= REGENERATE API KEY =================
app.post("/api/api-keys/regenerate", async (req, res) => {
  try {
    const { game_id } = req.body;
    if (!game_id) {
      return res.status(400).json({ error: "game_id required" });
    }

    await supabase
      .from("api_keys")
      .update({ revoked: true })
      .eq("game_id", game_id);

    const newKey = generateApiKey();

    await supabase.from("api_keys").insert({
      game_id,
      api_key: newKey,
      revoked: false
    });

    res.json({ success: true, api_key: newKey });
  } catch {
    res.status(500).json({ error: "Failed to regenerate API key" });
  }
});

// ================= DECISION API (PROTECTED) =================
app.post("/api/decision", apiKeyMiddleware, async (req, res) => {
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

    const risk_score = calculateRiskScore({
      playtime,
      deaths,
      restarts,
      earlyQuit: early_quit
    });

    const decision = getDecision(risk_score);

    await supabase.from("game_sessions").insert({
      game_id,
      player_id,
      session_id,
      playtime,
      deaths,
      restarts,
      early_quit,
      risk_score,
      decision
    });

    res.json({ success: true, risk_score, decision });
  } catch {
    res.status(500).json({ error: "Decision API failed" });
  }
});

// ================= ANALYTICS (PROTECTED) =================
app.get(
  "/api/analytics/game/:game_id",
  apiKeyMiddleware,
  async (req, res) => {
    try {
      const { game_id } = req.params;

      const { data } = await supabase
        .from("game_sessions")
        .select("decision, risk_score")
        .eq("game_id", game_id);

      if (!data || data.length === 0) {
        return res.json({
          game_id,
          total_sessions: 0,
          go_percent: 0,
          iterate_percent: 0,
          kill_percent: 0,
          average_risk: 0,
          health: "ITERATE"
        });
      }

      let go = 0,
        iterate = 0,
        kill = 0,
        riskSum = 0;

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
  }
);

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("LaunchSense backend running on", PORT);
});
