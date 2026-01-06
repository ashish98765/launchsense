function calculateRiskScore(metrics) {
  // Placeholder logic
  let score = 0;

  if (metrics.playtime < 60) score += 30;
  if (metrics.deaths > 10) score += 20;
  if (metrics.restarts > 5) score += 20;
  if (metrics.earlyQuit) score += 30;

  if (score > 100) score = 100;

  return score;
}

function getDecision(score) {
  if (score < 30) return "GO";
  if (score < 70) return "ITERATE";
  return "KILL";
}

module.exports = {
  calculateRiskScore,
  getDecision
};
