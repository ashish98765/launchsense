// reasonBuilder.js
// Generates human-readable explanation

function buildReason(signals, decision) {
  const highSignals = Object.entries(signals)
    .filter(([_, v]) => v === "HIGH")
    .map(([k]) => k.replace("_", " "));

  if (highSignals.length === 0) {
    return `Decision ${decision} based on overall healthy signals.`;
  }

  return `Decision ${decision} due to high ${highSignals.join(
    " and "
  )}.`;
}

module.exports = { buildReason };
