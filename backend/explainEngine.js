// Explainable Decision Engine
// Batch 1 – Intelligence Upgrade

function explainDecision(input, riskScore) {
  const reasons = [];

  if (input.deaths > 3) {
    reasons.push({
      factor: "High deaths",
      impact: Math.min(0.4, input.deaths / 10)
    });
  }

  if (input.session_length < 120) {
    reasons.push({
      factor: "Low session time",
      impact: Math.min(0.3, (120 - input.session_length) / 120)
    });
  }

  if (input.retries > 2) {
    reasons.push({
      factor: "Multiple retries",
      impact: Math.min(0.2, input.retries / 5)
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      factor: "Healthy engagement",
      impact: 0.1
    });
  }

  // normalize confidence
  const totalImpact = reasons.reduce((s, r) => s + r.impact, 0);
  const confidence = Math.min(1, 0.4 + totalImpact);

  return {
    confidence: Number(confidence.toFixed(2)),
    reasons: reasons
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
  };
}

module.exports = { explainDecision };
