/**
 * Trend Engine
 * Detects direction across recent decisions
 */

function analyzeTrend(logs = []) {
  if (logs.length < 3) {
    return {
      trend: "INSUFFICIENT_DATA",
      slope: 0,
    };
  }

  const scores = logs.map(l => l.risk_score);
  let delta = 0;

  for (let i = 1; i < scores.length; i++) {
    delta += scores[i] - scores[i - 1];
  }

  const avgDelta = delta / (scores.length - 1);

  if (avgDelta < -3) return { trend: "IMPROVING", slope: avgDelta };
  if (avgDelta > 3) return { trend: "WORSENING", slope: avgDelta };

  return { trend: "FLAT", slope: avgDelta };
}

module.exports = { analyzeTrend };
