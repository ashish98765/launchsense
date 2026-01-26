// orchestrator.js
// Single source of truth for LaunchSense decisions

const { decisionSchema } = require("./validator");
const { calculateDecision } = require("./decisionEngine");
const { calculateConfidence } = require("./confidenceEngine");
const { analyzeTrend } = require("./trendEngine");
const { analyzeTemporal } = require("./temporalEngine");
const { extractInsights } = require("./insightEngine");
const { generateRecommendations } = require("./recommendationEngine");
const { buildExplanation } = require("./explainEngine");
const { buildLedgerEntry } = require("./ledger");
const { evaluateRules } = require("./rulesEngine");

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

  // 3️⃣ Metrics (what rules read)
  const metrics = {
    deaths: input.deaths,
    early_quit_rate: input.early_quit ? 1 : 0,
    avg_session_time: input.playtime,
    restarts: input.restarts
  };

  // 4️⃣ RULE OVERRIDE (DB)
  const ruleHit = await evaluateRules({
    supabase,
    metrics
  });

  if (ruleHit) {
    return {
      ok: true,
      decision: ruleHit.decision,
      risk_score: null,
      confidence: "HIGH",
      rule: ruleHit,
      insights,
      source: "RULE_ENGINE"
    };
  }

  // 5️⃣ Model decision
  const decisionResult = calculateDecision({
    early_quit_rate: metrics.early_quit_rate,
    avg_session_time: metrics.avg_session_time,
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
      frustration: input.deaths > 3 ? 0.7 : 0.3,
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
