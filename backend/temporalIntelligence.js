// temporalIntelligence.js
// Batch-2: Trend / momentum detection

function analyzeTrend(history = []) {
  if (!history || history.length < 3) {
    return {
      direction: "FLAT",
      strength: "WEAK",
      slope: 0
    };
  }

  // take last N risk scores
  const scores = history
    .map(h => h.risk_score)
    .filter(v => typeof v === "number")
    .slice(-7);

  if (scores.length < 3) {
    return {
      direction: "FLAT",
      strength: "WEAK",
      slope: 0
    };
  }

  // simple slope
  const first = scores[0];
  const last = scores[scores.length - 1];
  const slope = (last - first) / scores.length;

  let direction = "FLAT";
  if (slope > 1) direction = "UP";
  if (slope < -1) direction = "DOWN";

  let strength = "WEAK";
  if (Math.abs(slope) > 2) strength = "MEDIUM";
  if (Math.abs(slope) > 4) strength = "STRONG";

  return {
    direction,
    strength,
    slope: Number(slope.toFixed(2))
  };
}

module.exports = { analyzeTrend };
