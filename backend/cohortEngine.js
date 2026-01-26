// cohortEngine.js
// Batch-3: Comparative / cohort intelligence

function calculatePercentile(value, values) {
  if (!values || values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.filter(v => v <= value).length;

  return Number((count / sorted.length).toFixed(2));
}

function compareWithCohort(current, history) {
  const pastRisks = history
    .map(h => h.risk_score)
    .filter(v => typeof v === "number");

  if (pastRisks.length < 5) {
    return {
      relative_risk: null,
      comparison: "INSUFFICIENT_DATA"
    };
  }

  const percentile = calculatePercentile(
    current.risk_score,
    pastRisks
  );

  let label = "AVERAGE";
  if (percentile >= 0.8) label = "WORSE_THAN_MOST";
  if (percentile <= 0.2) label = "BETTER_THAN_MOST";

  return {
    relative_risk: percentile,
    comparison: label
  };
}

module.exports = { compareWithCohort };
