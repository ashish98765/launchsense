/**
 * Confidence Engine
 * How sure are we about this decision?
 */

function calculateConfidence(sampleCount, trend) {
  if (sampleCount < 3) return "LOW";
  if (sampleCount >= 10 && trend !== "INSUFFICIENT_DATA") return "HIGH";
  return "MEDIUM";
}

module.exports = { calculateConfidence };
