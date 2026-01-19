// LaunchSense Backend — STEP 111 to STEP 120 (SDK, Idempotency, Webhooks, Observability)

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const timeout = require("connect-timeout");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { calculateRiskScore, getDecision } = require("./decisionEngine");

const app = express();
app.disable("x-powered-by");

// ================= CONFIG =================
[
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "PORT",
  "WEBHOOK_SIGNING_SECRET"
].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  WEBHOOK_SECRET: process.env.WEBHOOK_SIGNING_SECRET,
  FEATURE_WEBHOOKS: process.env.FEATURE_WEBHOOKS !== "off"
};

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "150kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => (req.timedout ? null : next()));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// ================= REQUEST ID + METRICS =================
const metrics = { total: 0, byPath: {}, latencyMs: [] };
app.use((req, res, next) => {
  const start = Date.now();
  metrics.total++;
  metrics.byPath[req.path] = (metrics.byPath[req.path] || 0) + 1;
  res.on("finish", () => metrics.latencyMs.push(Date.now() - start));
  req.id = crypto.randomUUID();
  next();
});

// ================= SUPABASE =================
const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_KEY
);

// ================= HELPERS =================
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg, type = "generic") =>
  res.status(code).json({ success: false, error: msg, type });

// ================= API VERSION =================
const v1 = express.Router();
app.use("/v1", v1);

// ================= API KEY AUTH =================
async function apiAuth(req, res, next) {
  const api_key = req.headers["x-api-key"];
  const game_id = req.headers["x-game-id"];
  if (!api_key || !game_id) return fail(res, 401, "Missing API key", "auth");

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key", "auth");
  req.game_id = game_id;
  next();
}

// ================= IDEMPOTENCY (STEP 112) =================
const idempoCache = new Map(); // key -> response
const IDEMPO_TTL = 5 * 60 * 1000;
function getIdempo(key) {
  const v = idempoCache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > IDEMPO_TTL) {
    idempoCache.delete(key);
    return null;
  }
  return v.res;
}
function setIdempo(key, res) {
  idempoCache.set(key, { res, ts: Date.now() });
}

// ================= HEALTH / READY (STEP 117) =================
v1.get("/", (_, res) => ok(res, { status: "LaunchSense v1 live" }));
v1.get("/ready", async (_, res) => ok(res, { ready: true }));

// ================= PUBLIC SDK — DECISION (STEP 111) =================
v1.post("/sdk/decision", apiAuth, async (req, res) => {
  try {
    const idem = req.headers["x-idempotency-key"];
    if (idem) {
      const cached = getIdempo(idem);
      if (cached) return res.json(cached);
    }

    const risk = calculateRiskScore(req.body);
    const decision = getDecision(risk);

    await supabase.from("game_sessions").insert({
      ...req.body,
      game_id: req.game_id,
      risk_score: risk,
      decision
    });

    const payload = { success: true, data: { risk_score: risk, decision } };
    if (idem) setIdempo(idem, payload);

    // STEP 113–114: webhook emit (decision)
    if (CONFIG.FEATURE_WEBHOOKS) emitWebhook("decision.created", {
      game_id: req.game_id,
      risk_score: risk,
      decision
    });

    res.json(payload);
  } catch {
    fail(res, 500, "Decision failed", "processing");
  }
});

// ================= USAGE SNAPSHOT (SDK) =================
v1.get("/sdk/usage", apiAuth, async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const { data } = await supabase
      .from("usage_monthly")
      .select("sessions")
      .eq("game_id", req.game_id)
      .eq("month", month)
      .maybeSingle();

    ok(res, { month, sessions_used: data?.sessions || 0 });
  } catch {
    fail(res, 500, "Usage failed", "processing");
  }
});

// ================= WEBHOOKS (STEP 113–114) =================
async function emitWebhook(event, payload) {
  const { data } = await supabase
    .from("webhooks")
    .select("id,url")
    .eq("active", true);

  if (!data || data.length === 0) return;

  for (const wh of data) {
    const body = JSON.stringify({ event, payload, at: Date.now() });
    const sig = crypto
      .createHmac("sha256", CONFIG.WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    // fire-and-forget; record attempt
    await supabase.from("webhook_events").insert({
      webhook_id: wh.id,
      event,
      delivered: false
    });

    fetch(wh.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-signature": sig
      },
      body
    }).catch(() => {});
  }
}

// ================= API DOCS SCHEMA (STEP 115) =================
v1.get("/docs/schema", (_, res) =>
  ok(res, {
    version: "v1",
    endpoints: {
      "POST /v1/sdk/decision": {
        headers: ["x-api-key", "x-game-id", "x-idempotency-key?"],
        body: ["playtime", "deaths", "restarts", "early_quit", "player_id", "session_id"]
      },
      "GET /v1/sdk/usage": { headers: ["x-api-key", "x-game-id"] }
    }
  })
);

// ================= OBSERVABILITY (STEP 116) =================
v1.get("/metrics", (_, res) =>
  ok(res, {
    total_requests: metrics.total,
    by_path: metrics.byPath,
    avg_latency_ms:
      metrics.latencyMs.length
        ? Math.round(metrics.latencyMs.reduce((a, b) => a + b, 0) / metrics.latencyMs.length)
        : 0
  })
);

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("LaunchSense v1 running on", CONFIG.PORT);
});
