// signalNormalizer.js
// Converts raw gameplay data → comparable signals

function normalizeSignals(input, history = []) {
  const playtimeMin = Math.max(input.playtime / 60, 1);

  const signals = {
    deaths_per_min: input.deaths / playtimeMin,
    restarts_per_min: input.restarts / playtimeMin,
    early_exit_flag: input.early_quit ? 1 : 0,
    session_depth: input.sessions?.length || 0
  };

  // historical baseline
  if (history.length > 0) {
    const avgRisk =
      history.reduce((a, b) => a + b.risk_score, 0) / history.length;

    signals.deviation_from_baseline =
      Math.abs(avgRisk - 50) / 50;
  } else {
    signals.deviation_from_baseline = 0;
  }

  return signals;
}

module.exports = { normalizeSignals };
