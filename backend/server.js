// LaunchSense Backend — STEP 91 to STEP 100 (Billing + Plans + Usage)

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
["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "PORT", "BILLING_WEBHOOK_SECRET"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY,
  WEBHOOK_SECRET: process.env.BILLING_WEBHOOK_SECRET
};

// ================= SECURITY =================
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "100kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => (req.timedout ? null : next()));

// ================= REQUEST ID =================
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ================= RATE LIMIT =================
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ================= SUPABASE =================
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ================= RESPONSE HELPERS =================
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

// ================= API VERSION =================
const v1 = express.Router();
app.use("/v1", v1);

// ================= API KEY AUTH =================
async function apiAuth(req, res, next) {
  const api_key = req.headers["x-api-key"];
  const game_id = req.headers["x-game-id"];
  if (!api_key || !game_id) return fail(res, 401, "Missing API key");

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("game_id", game_id)
    .eq("api_key", api_key)
    .eq("revoked", false)
    .maybeSingle();

  if (!data) return fail(res, 401, "Invalid API key");
  req.game_id = game_id;
  next();
}

// ================= PROJECT GUARD =================
async function projectGuard(req, res, next) {
  const { data } = await supabase
    .from("projects")
    .select("status, deleted, plan")
    .eq("game_id", req.game_id)
    .maybeSingle();

  if (!data || data.deleted) return fail(res, 403, "Project deleted");
  if (data.status !== "active") return fail(res, 403, "Project inactive");

  req.plan = data.plan || "free";
  next();
}

// ================= PLAN LIMITS (STEP 91–94) =================
const PLAN_LIMITS = {
  free: { monthly_sessions: 10000, hard_stop: true },
  pro: { monthly_sessions: 200000, hard_stop: false }
};

async function usageGuard(req, res, next) {
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await supabase
    .from("usage_monthly")
    .select("sessions")
    .eq("game_id", req.game_id)
    .eq("month", month)
    .maybeSingle();

  const used = data?.sessions || 0;
  const limit = PLAN_LIMITS[req.plan].monthly_sessions;

  if (used >= limit) {
    return fail(res, 402, "Monthly quota exceeded");
  }
  next();
}

// ================= HEALTH =================
v1.get("/", (_, res) => ok(res, { status: "LaunchSense v1 live" }));

// ================= DECISION API (METERED) =================
v1.post(
  "/decision",
  apiAuth,
  projectGuard,
  usageGuard,
  async (req, res) => {
    try {
      const risk = calculateRiskScore(req.body);
      const decision = getDecision(risk);

      await supabase.from("game_sessions").insert({
        ...req.body,
        game_id: req.game_id,
        risk_score: risk,
        decision
      });

      // STEP 92: usage metering
      const month = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from("usage_monthly")
        .select("sessions")
        .eq("game_id", req.game_id)
        .eq("month", month)
        .maybeSingle();

      if (!data) {
        await supabase.from("usage_monthly").insert({
          game_id: req.game_id,
          month,
          sessions: 1
        });
      } else {
        await supabase
          .from("usage_monthly")
          .update({ sessions: data.sessions + 1 })
          .eq("game_id", req.game_id)
          .eq("month", month);
      }

      ok(res, { risk_score: risk, decision });
    } catch {
      fail(res, 500, "Decision failed");
    }
  }
);

// ================= USAGE SNAPSHOT (STEP 98) =================
v1.get("/usage/:game_id", async (req, res) => {
  try {
    const { game_id } = req.params;
    const { data } = await supabase
      .from("usage_monthly")
      .select("*")
      .eq("game_id", game_id)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    ok(res, {
      game_id,
      current_month: data?.month || null,
      sessions_used: data?.sessions || 0
    });
  } catch {
    fail(res, 500, "Usage fetch failed");
  }
});

// ================= BILLING WEBHOOK (STEP 95–97) =================
v1.post("/billing/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const sig = req.headers["x-signature"];
    const body = req.body.toString();

    const expected = crypto
      .createHmac("sha256", CONFIG.WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (sig !== expected) return fail(res, 401, "Invalid signature");

    const event = JSON.parse(body);

    if (event.type === "plan.updated") {
      await supabase
        .from("projects")
        .update({ plan: event.plan })
        .eq("game_id", event.game_id);
    }

    ok(res, { received: true });
  } catch {
    fail(res, 400, "Webhook failed");
  }
});

// ================= SAFE SHUTDOWN =================
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("LaunchSense v1 running on", CONFIG.PORT);
});
