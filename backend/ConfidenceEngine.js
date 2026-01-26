// confidenceEngine.js
// Deterministic confidence score (0–1)

function calculateConfidence({ signals, source }) {
  let score = 0.5;

  Object.values(signals).forEach((level) => {
    if (level === "HIGH") score += 0.15;
    if (level === "LOW") score -= 0.05;
  });

  // DB rules are more confident than model
  if (source === "DB_RULE") score += 0.2;

  return Math.min(1, Math.max(0, Number(score.toFixed(2))));
}

module.exports = { calculateConfidence };
