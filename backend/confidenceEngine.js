// confidenceEngine.js
// Batch-4: Weighted, bounded confidence

async function calculateConfidence({ signals, source, supabase }) {
  let score = 0.5;

  const { data: weights } = await supabase
    .from("signal_weights")
    .select("*");

  const weightMap = {};
  (weights || []).forEach(w => {
    weightMap[w.signal_key] = w;
  });

  Object.entries(signals).forEach(([key, level]) => {
    const w = weightMap[key]?.weight || 1;

    if (level === "HIGH") score += 0.15 * w;
    if (level === "LOW") score -= 0.05 * w;
  });

  if (source === "DB_RULE") score += 0.2;

  return Math.min(1, Math.max(0, Number(score.toFixed(2))));
}

module.exports = { calculateConfidence };
