/**
 * orchestrator.js
 * Single source of truth for LaunchSense decision flow
 */

const { decisionSchema } = require("./validator");
const { extractInsights } = require("./insightEngine");
const { analyzeTemporal } = require("./temporalEngine");
const { analyzeTrend } = require("./trendEngine");
const { buildCounterfactuals } = require("./counterfactualEngine");
const { generateRecommendations } = require("./recommendationEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");
const { calculateConfidence } = require("./confidenceEngine");
const { evaluateRules } = require("./ruleEngine");

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

  // 2️⃣ Insights
  const insights = extractInsights(input);

  // 3️⃣ Derived metrics (THIS feeds DB rules)
  const metrics = {
    early_quit_rate: input.early_quit ? 1 : 0,
    deaths: input.deaths,
    restarts: input.restarts,
    playtime: input.playtime,
    sessions: input.sessions?.length || 0
  };

  // 4️⃣ DB Rules Evaluation (🔥 CORE CHANGE)
  const ruleResult = await evaluateRules({
    supabase,
    metrics
  });

  // 5️⃣ Confidence
  const confidence = calculateConfidence(
    history.length,
    insights.primary_risk
  );

  // 6️⃣ Temporal + trend
  const temporal = analyzeTemporal(history);
  const trend = analyzeTrend(history);

  // 7️⃣ Counterfactuals
  const counterfactuals = buildCounterfactuals({
    risk: 50,
    confidence,
    momentum: trend.slope || 0
  });

  // 8️⃣ Recommendations
  const recommendations = generateRecommendations(
    ruleResult.decision,
    50,
    insights
  );

  // 9️⃣ Explanation
  const explanation = buildExplanation(
    input,
    {
      engagement: 1 - metrics.early_quit_rate,
      frustration: metrics.deaths > 3 ? 0.7 : 0.3,
      early_exit: input.early_quit,
      confidence
    },
    ruleResult.decision
  );

  // 🔟 Ledger
  const ledger = buildLedgerEntry({
    game_id: input.game_id,
    decision: ruleResult.decision,
    source: "RULE_ENGINE",
    confidence,
    explanation_id: explanation.explanation_id,
    metrics,
    rule: ruleResult
  });

  return {
    ok: true,
    decision: ruleResult.decision,
    confidence,
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
