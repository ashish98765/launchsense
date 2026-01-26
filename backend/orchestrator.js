/**
 * LaunchSense Orchestrator
 * Single source of truth for decision intelligence
 * Batch 5 – Intelligence integrated
 */

const { decisionSchema } = require("./validator");

const { calculateDecision } = require("./decisionEngine");
const { buildCounterfactuals } = require("./counterfactualEngine");
const { calculateConfidence: legacyConfidence } = require("./confidenceEngine");

const { analyzeTemporal } = require("./temporalEngine");
const { analyzeTrend } = require("./trendEngine");

const { extractInsights } = require("./insightEngine");
const { generateRecommendations } = require("./recommendationEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");

// 🧠 Batch 5 – Intelligence layer
const { normalizeSignals } = require("./model/signalNormalizer");
const { calculateConfidence } = require("./model/confidenceModel");

async function runDecisionPipeline({ input, history = [] }) {
  /* ---------------- VALIDATION ---------------- */
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      details: parsed.error.flatten()
    };
  }

  /* ---------------- NORMALIZATION (B5) ---------------- */
  const normalizedSignals = normalizeSignals(input, history);

  /* ---------------- INSIGHTS ---------------- */
  const insights = extractInsights(input);

  /* ---------------- CORE DECISION ---------------- */
  const decisionResult = calculateDecision({
    early_quit_rate: input.early_quit ? 1 : 0,
    avg_session_time: input.playtime,
    deaths_per_session: input.deaths,
    restart_rate: input.restarts,
    signals: normalizedSignals
  });

  /* ---------------- TEMPORAL INTELLIGENCE ---------------- */
  const temporal = analyzeTemporal(history);

  /* ---------------- TREND INTELLIGENCE ---------------- */
  const trend = analyzeTrend(history);

  /* ---------------- COUNTERFACTUALS ---------------- */
  const counterfactuals = buildCounterfactuals({
    risk: decisionResult.riskScore / 100,
    confidence: decisionResult.confidence,
    momentum: trend.slope || 0
  });

  /* ---------------- CONFIDENCE (B5) ---------------- */
  const confidenceLabel = calculateConfidence({
    riskScore: decisionResult.riskScore,
    historyLength: history.length,
    ruleMatched: decisionResult.rule_applied || false
  });

  /* ---------------- RECOMMENDATIONS ---------------- */
  const recommendations = generateRecommendations(
    decisionResult.decision,
    decisionResult.riskScore,
    insights
  );

  /* ---------------- EXPLANATION ---------------- */
  const explanation = buildExplanation(
    input,
    {
      engagement: 1 - decisionResult.riskScore / 100,
      frustration: input.deaths > 3 ? 0.7 : 0.3,
      early_exit: input.early_quit,
      confidence: confidenceLabel
    },
    decisionResult.decision
  );

  /* ---------------- LEDGER (IMMUTABLE) ---------------- */
  const ledger = buildLedgerEntry({
    game_id: input.game_id,
    decision: decisionResult.decision,
    source: "AI",
    risk_score: decisionResult.riskScore,
    confidence: confidenceLabel,
    explanation_id: explanation.explanation_id,
    temporal,
    trend,
    normalizedSignals,
    input
  });

  /* ---------------- FINAL RESPONSE ---------------- */
  return {
    ok: true,

    // Decision
    decision: decisionResult.decision,
    risk_score: decisionResult.riskScore,
    confidence: confidenceLabel,

    // Intelligence
    signals_normalized: normalizedSignals,
    insights,
    temporal,
    trend,
    counterfactuals,

    // Action layer
    recommendations,

    // Explainability
    explanation,

    // Audit
    ledger
  };
}

module.exports = { runDecisionPipeline };
