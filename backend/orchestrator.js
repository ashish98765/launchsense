/**
 * orchestrator.js
 * Batch-4: Learning / Weight Adjustment
 */

const { decisionSchema } = require("./validator");
const { calculateDecision } = require("./decisionEngine");
const { extractInsights } = require("./insightEngine");
const { buildLedgerEntry } = require("./ledger");

// Batch 1
const { classifySignals } = require("./signalClassifier");
const { calculateConfidence } = require("./confidenceEngine");
const { buildReason } = require("./reasonBuilder");

// Batch 2
const { analyzeTrend } = require("./temporalIntelligence");

// Batch 3
const { compareWithCohort } = require("./cohortEngine");

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
        priority: rule.priority,
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
    return { ok: false, error: "INVALID_INPUT" };
  }

  // 2️⃣ Insights
  const insights = extractInsights(input);

  // 3️⃣ Metrics
  const metrics = {
    deaths: input.deaths || 0,
    early_quit: input.early_quit ? 1 : 0,
    playtime: input.playtime || 0,
    restarts: input.restarts || 0
  };

  // 4️⃣ Signals
  const signals = classifySignals(metrics);

  // 5️⃣ Trend
  const trend = analyzeTrend(history);

  // 6️⃣ Rules
  const rules = await fetchActiveRules(supabase);
  const ruleHit = applyRules({ rules, metrics });

  // 7️⃣ Rule short-circuit
  if (ruleHit) {
    const confidence = await calculateConfidence({
      signals,
      source: "DB_RULE",
      supabase
    });

    const reason =
      buildReason(signals, ruleHit.decision) +
      ` Trend: ${trend.direction}`;

    return {
      ok: true,
      decision: ruleHit.decision,
      confidence,
      signals,
      trend,
      reason,
      source: "DB_RULE"
    };
  }

  // 8️⃣ Model decision
  const decisionResult = calculateDecision({
    early_quit_rate: metrics.early_quit,
    avg_session_time: metrics.playtime,
    deaths_per_session: metrics.deaths,
    restart_rate: metrics.restarts
  });

  // 9️⃣ Cohort
  const cohort = compareWithCohort(
    { risk_score: decisionResult.riskScore },
    history
  );

  const confidence = await calculateConfidence({
    signals,
    source: "MODEL",
    supabase
  });

  let reason =
    buildReason(signals, decisionResult.decision) +
    ` Trend: ${trend.direction}`;

  if (cohort.relative_risk !== null) {
    reason += ` Compared to past launches: ${cohort.comparison}`;
  }

  const ledger = buildLedgerEntry({
    game_id: input.game_id,
    decision: decisionResult.decision,
    source: "MODEL",
    confidence,
    signals,
    trend,
    cohort,
    input
  });

  return {
    ok: true,
    decision: decisionResult.decision,
    risk_score: decisionResult.riskScore,
    confidence,
    signals,
    trend,
    cohort,
    reason,
    insights,
    ledger,
    source: "MODEL"
  };
}

module.exports = { runDecisionPipeline };
