// Counterfactual Engine — A2
// Simulates alternative futures & minimizes regret

function simulateDecision({ decision, risk, confidence, momentum }) {
  switch (decision) {
    case "GO":
      return {
        expected_risk: Math.min(risk + 0.15, 1),
        burn: "HIGH",
        upside: "HIGH",
        confidence: Math.max(confidence - 0.2, 0.2)
      };

    case "ITERATE":
      return {
        expected_risk: Math.max(risk - 0.2, 0),
        burn: "MEDIUM",
        upside: "MEDIUM",
        confidence: Math.min(confidence + 0.1, 1)
      };

    case "KILL":
      return {
        expected_risk: 0.05,
        burn: "LOW",
        upside: "LOW",
        confidence: Math.min(confidence + 0.05, 1)
      };

    default:
      return {};
  }
}

function regretScore(outcome) {
  let score = 0;
  if (outcome.burn === "HIGH") score += 2;
  if (outcome.upside === "LOW") score += 2;
  score += outcome.expected_risk * 3;
  return score;
}

function buildCounterfactuals(base) {
  const options = ["GO", "ITERATE", "KILL"];

  const simulations = {};
  options.forEach(opt => {
    const sim = simulateDecision({ ...base, decision: opt });
    simulations[opt] = {
      ...sim,
      regret: regretScore(sim)
    };
  });

  // find minimum regret option
  let safest = "ITERATE";
  let min = Infinity;

  Object.keys(simulations).forEach(k => {
    if (simulations[k].regret < min) {
      min = simulations[k].regret;
      safest = k;
    }
  });

  return {
    safest_decision: safest,
    simulations
  };
}

module.exports = { buildCounterfactuals };
