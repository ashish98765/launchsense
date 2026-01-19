// Explainability Engine v2
// Purpose: Structured, persistent, auditable decision reasoning

const crypto = require("crypto");

function buildExplanation(input, metrics, decision) {
  const reasons = [];

  if (metrics.engagement < 0.3) {
    reasons.push({
      factor: "engagement",
      impact: "negative",
      weight: 0.4,
      note: "Low player engagement"
    });
  }

  if (metrics.frustration > 0.6) {
    reasons.push({
      factor: "frustration",
      impact: "negative",
      weight: 0.4,
      note: "High frustration signals"
    });
  }

  if (metrics.early_exit) {
    reasons.push({
      factor: "early_exit",
      impact: "negative",
      weight: 0.2,
      note: "Early session termination"
    });
  }

  if (metrics.engagement > 0.7) {
    reasons.push({
      factor: "engagement",
      impact: "positive",
      weight: 0.4,
      note: "Strong sustained engagement"
    });
  }

  return {
    explanation_id: crypto.randomUUID(),
    decision,
    reasons,
    confidence: metrics.confidence,
    created_at: new Date().toISOString(),
    input_snapshot: {
      playtime: input.playtime || 0,
      deaths: input.deaths || 0,
      restarts: input.restarts || 0,
      early_quit: input.early_quit || false
    }
  };
}

module.exports = { buildExplanation };
