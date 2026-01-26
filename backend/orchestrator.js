/**
 * orchestrator.js
 * DB Rules > Model (fallback)
 */

const { decisionSchema } = require("./validator");
const { calculateDecision } = require("./decisionEngine");
const { calculateConfidence } = require("./confidenceEngine");
const { analyzeTrend } = require("./trendEngine");
const { analyzeTemporal } = require("./temporalEngine");
const { extractInsights } = require("./insightEngine");
const { generateRecommendations } = require("./recommendationEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");

// ---------------- RULE HELPERS ----------------

async function fetchActiveRules(supabase) {
  const { data, error } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false });

  if (error) {
    console.error("❌ Rule fetch failed:", error);
    return [];
  }
  return data || [];
}

function applyRules({ rules, metrics }) {
  for (const rule of rules) {
    const value = metrics[rule.rule_key];
    if (value === undefined || value === null) continue;

    const minOk =
      rule.min_value === null || value >= rule.min_value;
    const maxOk =
      rule.max_value === null || value <= rule.max_value;

    if (minOk && maxOk) {
      return {
        decision: rule.decision,
        rule_key: rule.rule_key,
        value,
        priority: rule.priority,
        description: rule.description || null,
        source: "DB_RULE"
      };
    }
  }
  return null;
}

// ---------------- MAIN PIPELINE ----------------

async function runDecisionPipeline({ input, history = [], supabase }) {
  // 1️⃣ Validate
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT", details: parsed.error.flatten() };
  }

  // 2️⃣ Insights
  const insights = extractInsights(input);

  // 3️⃣ Metrics (what rules read)
  const metrics = {
    deaths: input.deaths,
    early_quit: input.early_quit ? 1 : 0,
    playtime: input.playtime,
    restarts: input.restarts
  };

  // 4️⃣ DB RULES (AUTHORITATIVE)
  const rules = await fetchActiveRules(supabase);
  const ruleHit = applyRules({ rules, metrics });

  // 5️⃣ If rule hit → short circuit
  if (ruleHit) {
    const confidence = "HIGH";

    const ledger = buildLedgerEntry({
      game_id: input.game_id,
      decision: ruleHit.decision,
      source: ruleHit.source,
      confidence,
      metrics,
      rule: ruleHit
    });

    return {
      ok: true,
      decision: ruleHit.decision,
      confidence,
      primary_reason: ruleHit.description || "DB rule applied",
      insights,
      ledger,
      source: "DB_RULE"
    };
  }

  // 6️⃣ MODEL FALLBACK
  const decisionResult = calculateDecision({
    early_quit_rate: metrics.early_quit,
    avg_session_time: metrics.playtime,
    deaths_per_session: metrics.deaths,
    restart_rate: metrics.restarts
  });

  const confidence = calculateConfidence(
    history.length,
    insights.primary_risk
  );

  const trend = analyzeTrend(history);
  const temporal = analyzeTemporal(history);

  const explanation = buildExplanation(
    input,
    {
      engagement: 1 - decisionResult.riskScore / 100,
      frustration: metrics.deaths > 3 ? 0.7 : 0.3,
      early_exit: input.early_quit,
      confidence
    },
    decisionResult.decision
  );

  const ledger = buildLedgerEntry({
    game_id: input.game_id,
    decision: decisionResult.decision,
    source: "MODEL",
    risk_score: decisionResult.riskScore,
    confidence,
    explanation_id: explanation.explanation_id,
    temporal,
    input
  });

  return {
    ok: true,
    decision: decisionResult.decision,
    risk_score: decisionResult.riskScore,
    confidence,
    insights,
    trend,
    temporal,
    explanation,
    ledger,
    source: "MODEL"
  };
}

module.exports = { runDecisionPipeline };
