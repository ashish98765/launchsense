// LaunchSense Backend — STEP 101 to STEP 110 (Orgs, Teams, RBAC, Dashboard)

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
["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "PORT"].forEach(k => {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
});

const CONFIG = {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY
};

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json({ limit: "100kb" }));
app.use(timeout("10s"));
app.use((req, res, next) => (req.timedout ? null : next()));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ================= REQUEST ID =================
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// ================= SUPABASE =================
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ================= HELPERS =================
const ok = (res, data) => res.json({ success: true, data });
const fail = (res, code, msg) =>
  res.status(code).json({ success: false, error: msg });

async function audit(user_id, event, meta = {}) {
  try {
    await supabase.from("audit_logs").insert({
      user_id,
      event,
      meta,
      at: new Date().toISOString()
    });
  } catch (_) {}
}

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

// ================= ORG + RBAC =================
async function orgGuard(req, res, next) {
  const user_id = req.headers["x-user-id"];
  const org_id = req.headers["x-org-id"];
  if (!user_id || !org_id) return fail(res, 401, "Missing org context");

  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", org_id)
    .eq("user_id", user_id)
    .maybeSingle();

  if (!data) return fail(res, 403, "Not org member");

  req.user_id = user_id;
  req.org_id = org_id;
  req.role = data.role;
  next();
}

function requireRole(roles = []) {
  return (req, res, next) =>
    roles.includes(req.role)
      ? next()
      : fail(res, 403, "Insufficient role");
}

// ================= HEALTH =================
v1.get("/", (_, res) => ok(res, { status: "LaunchSense v1 live" }));

// ================= ORG CREATE (STEP 101) =================
v1.post("/orgs", async (req, res) => {
  try {
    const { user_id, name } = req.body;
    if (!user_id || !name) return fail(res, 400, "Invalid payload");

    const org_id = "org_" + Date.now();
    await supabase.from("orgs").insert({ org_id, name });
    await supabase.from("org_members").insert({
      org_id,
      user_id,
      role: "owner"
    });

    await audit(user_id, "org.created", { org_id });
    ok(res, { org_id, name });
  } catch {
    fail(res, 500, "Org create failed");
  }
});

// ================= PROJECT LIST (STEP 106,109) =================
v1.get("/orgs/:org_id/projects", orgGuard, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 20);
    const from = (page - 1) * size;
    const to = from + size - 1;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("org_id", req.org_id)
      .range(from, to);

    ok(res, { page, size, items: data || [] });
  } catch {
    fail(res, 500, "List failed");
  }
});

// ================= ADD MEMBER (STEP 108) =================
v1.post(
  "/orgs/:org_id/members",
  orgGuard,
  requireRole(["owner", "admin"]),
  async (req, res) => {
    try {
      const { user_id, role } = req.body;
      if (!user_id || !role) return fail(res, 400, "Invalid payload");

      await supabase.from("org_members").insert({
        org_id: req.org_id,
        user_id,
        role
      });

      await audit(req.user_id, "org.member.added", { user_id, role });
      ok(res, { added: true });
    } catch {
      fail(res, 500, "Add member failed");
    }
  }
);

// ================= PROJECT MEMBERS (STEP 103–104) =================
v1.post(
  "/projects/:game_id/members",
  orgGuard,
  requireRole(["owner", "admin"]),
  async (req, res) => {
    try {
      const { user_id, role } = req.body;
      await supabase.from("project_members").insert({
        game_id: req.params.game_id,
        user_id,
        role
      });
      await audit(req.user_id, "project.member.added", {
        game_id: req.params.game_id,
        user_id,
        role
      });
      ok(res, { added: true });
    } catch {
      fail(res, 500, "Project member add failed");
    }
  }
);

// ================= DASHBOARD KPIs (STEP 107) =================
v1.get(
  "/dashboard/kpis/:game_id",
  apiAuth,
  async (req, res) => {
    try {
      const { data } = await supabase
        .from("daily_analytics")
        .select("*")
        .eq("game_id", req.params.game_id)
        .order("date", { ascending: false })
        .limit(7);

      if (!data || data.length === 0)
        return ok(res, { sessions: 0, avg_risk: 0, health: "ITERATE" });

      const total = data.reduce((s, d) => s + d.total_sessions, 0);
      const avgRisk = Math.round(
        data.reduce((s, d) => s + d.avg_risk, 0) / data.length
      );

      ok(res, {
        days: data.length,
        total_sessions: total,
        avg_risk: avgRisk
      });
    } catch {
      fail(res, 500, "KPI fetch failed");
    }
  }
);

// ================= SAFE SHUTDOWN =================
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

// ================= START =================
app.listen(CONFIG.PORT, () => {
  console.log("LaunchSense v1 running on", CONFIG.PORT);
});
