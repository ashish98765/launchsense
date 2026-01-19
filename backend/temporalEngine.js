// Temporal Intelligence Engine
// Purpose: Time-aware risk interpretation

function analyzeTemporal(data = []) {
  if (data.length < 3) {
    return {
      trend: "INSUFFICIENT_DATA",
      volatility: 0,
      shock: false
    };
  }

  const values = data.map(d => d.avg_risk);

  // Trend
  const slope =
    (values[0] - values[values.length - 1]) / values.length;

  let trend = "STABLE";
  if (slope > 1) trend = "RISING";
  if (slope < -1) trend = "DECLINING";

  // Volatility
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const volatility = Math.round(Math.sqrt(variance));

  // Shock detection
  const shock =
    Math.abs(values[0] - values[1]) > 25;

  return {
    trend,
    volatility,
    shock
  };
}

module.exports = { analyzeTemporal };
