// signalClassifier.js
// Converts raw metrics into LOW / MEDIUM / HIGH signals

function classify(value, thresholds) {
  if (value >= thresholds.high) return "HIGH";
  if (value >= thresholds.medium) return "MEDIUM";
  return "LOW";
}

function classifySignals(metrics) {
  return {
    early_quit: metrics.early_quit === 1 ? "HIGH" : "LOW",

    deaths: classify(metrics.deaths, {
      medium: 3,
      high: 6
    }),

    playtime: classify(
      -metrics.playtime,
      {
        medium: -300,
        high: -120
      }
    ),

    restarts: classify(metrics.restarts, {
      medium: 2,
      high: 5
    })
  };
}

module.exports = { classifySignals };
