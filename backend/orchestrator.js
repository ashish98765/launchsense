// orchestrator.js
// Single source of truth for LaunchSense decision flow

const { decisionSchema } = require("./validator");
const { calculateDecision } = require("./decisionEngine");
const { buildCounterfactuals } = require("./counterfactualEngine");
const { calculateConfidence } = require("./confidenceEngine");
const { analyzeTemporal } = require("./temporalEngine");
const { analyzeTrend } = require("./trendEngine");
const { extractInsights } = require("./insightEngine");
const { generateRecommendations } = require("./recommendationEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");

async function runDecisionPipeline({ input, history = [] }) {
  // 1️⃣ Validate input contract
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      details: parsed.error.flatten()
    };
  }

  // 2️⃣ Insights (events + sessions)
  const insights = extractInsights(input);

  // 3️⃣ Core decision (risk + signals)
  const decisionResult = calculateDecision({
    early_quit_rate: input.early_quit ? 1 : 0,
    avg_session_time: input.playtime,
    deaths_per_session: input.deaths,
    restart_rate: input.restarts
  });

  // 4️⃣ Confidence layer
  const confidenceLabel = calculateConfidence(
    history.length,
    insights.primary_risk
  );

  // 5️⃣ Temporal intelligence
  const temporal = analyzeTemporal(history);

  // 6️⃣ Trend intelligence
  const trend = analyzeTrend(history);

  // 7️⃣ Counterfactual simulation
  const counterfactuals = buildCounterfactuals({
    risk: decisionResult.riskScore / 100,
    confidence: decisionResult.confidence,
    momentum: trend.slope || 0
  });

  // 8️⃣ Recommendations
  const recommendations = generateRecommendations(
    decisionResult.decision,
    decisionResult.riskScore,
    insights
  );

  // 9️⃣ Explanation (auditable)
  const explanation = buildExplanation(
    input,
    {
      engagement: 1 - decisionResult.riskScore / 100,
      frustration: input.deaths > 3 ? 0.7 : 0.3,
      early_exit: input.early_quit,
      confidence: decisionResult.confidence
    },
    decisionResult.decision
  );

  // 🔟 Ledger entry (immutable)
  const ledger = buildLedgerEntry({
    game_id: input.game_id,
    decision: decisionResult.decision,
    source: "AI",
    risk_score: decisionResult.riskScore,
    confidence: decisionResult.confidence,
    explanation_id: explanation.explanation_id,
    temporal,
    input
  });

  return {
    ok: true,
    decision: decisionResult.decision,
    risk_score: decisionResult.riskScore,
    confidence: decisionResult.confidence,
    signals: decisionResult.signals,
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
