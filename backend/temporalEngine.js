// Temporal Intelligence Engine — A1
// Computes trend, volatility, shock & stability

function analyzeTemporal(history = []) {
  if (!Array.isArray(history) || history.length < 3) {
    return {
      trend: "STABLE",
      volatility: 0,
      shock: false,
      stability: "Medium"
    };
  }

  const values = history
    .map(h => Number(h.avg_risk))
    .filter(v => !isNaN(v));

  const diffs = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i - 1] - values[i]);
  }

  const avgDiff =
    diffs.reduce((a, b) => a + b, 0) / diffs.length;

  let trend = "STABLE";
  if (avgDiff > 2) trend = "IMPROVING";
  if (avgDiff < -2) trend = "DECLINING";

  const mean =
    values.reduce((a, b) => a + b, 0) / values.length;

  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
    values.length;

  const volatility = Math.sqrt(variance);

  const shock =
    Math.abs(values[0] - values[1]) > 25;

  let stability = "Medium";
  if (!shock && volatility < 8) stability = "High";
  if (shock || volatility > 18) stability = "Low";

  return {
    trend,
    volatility: Math.round(volatility),
    shock,
    stability
  };
}

module.exports = { analyzeTemporal };
