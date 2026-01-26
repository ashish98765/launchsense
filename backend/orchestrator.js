/**
 * orchestrator.js
 * Single brain of LaunchSense
 * DB rules > AI logic
 */

const { decisionSchema } = require("./validator");

const { calculateDecision } = require("./decisionEngine");
const { extractInsights } = require("./insightEngine");
const { analyzeTemporal } = require("./temporalEngine");
const { analyzeTrend } = require("./trendEngine");
const { calculateConfidence } = require("./confidenceEngine");
const { buildCounterfactuals } = require("./counterfactualEngine");
const { generateRecommendations } = require("./recommendationEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");

// ───────────────── RULE HELPERS ─────────────────

async function loadRules(supabase, ruleKey) {
  const { data, error } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("rule_key", ruleKey)
    .eq("active", true)
    .order("priority", { ascending: false });

  if (error) {
    console.error("❌ Rule load failed:", error);
    return [];
  }

  return data || [];
}

function evaluateRules(rules, value) {
  for (const rule of rules) {
    if (value >= rule.min_value && value < rule.max_value) {
      return {
        decision: rule.decision,
        rule_id: rule.id,
        description: rule.description
      };
    }
  }
  return null;
}

// ───────────────── MAIN PIPELINE ─────────────────

async function runDecisionPipeline({ input, history = [], supabase }) {
  // 1️⃣ Validate input
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      details: parsed.error.flatten()
    };
  }

  // 2️⃣ Metrics calculation (truth layer)
  const earlyQuitRate = input.early_quit ? 1 : 0;
  const avgSessionTime = input.playtime || 0;
  const deathsPerSession = input.deaths || 0;

  // 3️⃣ Insights
  const insights = extractInsights(input);

  // 4️⃣ AI baseline decision
  let decisionResult = calculateDecision({
    early_quit_rate: earlyQuitRate,
    avg_session_time: avgSessionTime,
    deaths_per_session: deathsPerSession,
    restart_rate: input.restarts || 0
  });

  let primaryReason = "AI evaluation";

  // 5️⃣ DB RULE OVERRIDES (IN ORDER OF AUTHORITY)

  // Early quit rules
  const earlyQuitRules = await loadRules(
    supabase,
    "early_quit_rate"
  );

  const earlyQuitRuleDecision = evaluateRules(
    earlyQuitRules,
    earlyQuitRate
  );

  if (earlyQuitRuleDecision) {
    decisionResult.decision = earlyQuitRuleDecision.decision;
    primaryReason = earlyQuitRuleDecision.description || "Early quit rule";
  }

  // Deaths per session rules
  const deathRules = await loadRules(
    supabase,
    "deaths_per_session"
  );

  const deathRuleDecision = evaluateRules(
    deathRules,
    deathsPerSession
  );

  if (deathRuleDecision) {
    decisionResult.decision = deathRuleDecision.decision;
    primaryReason = deathRuleDecision.description || "Death rate rule";
  }

  // 6️⃣ Confidence
  const confidence = calculateConfidence(
    history.length,
    insights.primary_risk
  );

  // 7️⃣ Temporal + trend
  const temporal = analyzeTemporal(history);
  const trend = analyzeTrend(history);

  // 8️⃣ Counterfactuals
  const counterfactuals = buildCounterfactuals({
    risk: decisionResult.riskScore / 100,
    confidence,
    momentum: trend.slope || 0
  });

  // 9️⃣ Recommendations
  const recommendations = generateRecommendations(
    decisionResult.decision,
    decisionResult.riskScore,
    insights
  );

  // 🔟 Explanation
  const explanation = buildExplanation(
    input,
    {
      engagement: 1 - decisionResult.riskScore / 100,
      frustration: deathsPerSession > 3 ? 0.7 : 0.3,
      early_exit: input.early_quit,
      confidence
    },
    decisionResult.decision
  );

  // 1️⃣1️⃣ Ledger
  const ledger = buildLedgerEntry({
    game_id: input.game_id,
    decision: decisionResult.decision,
    source: "AI+DB_RULES",
    risk_score: decisionResult.riskScore,
    confidence,
    reason: primaryReason,
    explanation_id: explanation.explanation_id,
    temporal,
    input
  });

  // 1️⃣2️⃣ Final stable response
  return {
    ok: true,
    decision: decisionResult.decision,
    risk_score: decisionResult.riskScore,
    confidence,
    primary_reason: primaryReason,
    insights,
    temporal,
    trend,
    counterfactuals,
    recommendations,
    explanation,
    ledger
  };
}

module.exports = { runDecisionPipeline };
