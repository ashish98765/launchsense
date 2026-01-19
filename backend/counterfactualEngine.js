// Counterfactual Engine — A2 HARDENED
// Deterministic | Regret-Minimized | Production Safe

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function simulate(decision, base) {
  const { risk, confidence, momentum } = base;

  if (decision === "GO") {
    return {
      expected_risk: clamp(risk + 0.18 + momentum * 0.05, 0, 1),
      burn: 0.9,
      upside: 0.85,
      confidence: clamp(confidence - 0.15, 0.2, 0.95)
    };
  }

  if (decision === "ITERATE") {
    return {
      expected_risk: clamp(risk - 0.25, 0, 1),
      burn: 0.5,
      upside: 0.6,
      confidence: clamp(confidence + 0.1, 0.2, 0.95)
    };
  }

  if (decision === "KILL") {
    return {
      expected_risk: 0.05,
      burn: 0.1,
      upside: 0.15,
      confidence: clamp(confidence + 0.05, 0.2, 0.95)
    };
  }

  return null;
}

function regret(outcome) {
  return clamp(
    outcome.burn * 3 +
      (1 - outcome.upside) * 3 +
      outcome.expected_risk * 4,
    0,
    10
  );
}

function buildCounterfactuals(base) {
  const safeBase = {
    risk: clamp(base.risk, 0, 1),
    confidence: clamp(base.confidence, 0.2, 0.95),
    momentum: clamp(base.momentum || 0, -10, 10)
  };

  const decisions = ["GO", "ITERATE", "KILL"];
  const simulations = {};

  decisions.forEach(d => {
    const outcome = simulate(d, safeBase);
    simulations[d] = {
      ...outcome,
      regret: regret(outcome)
    };
  });

  let safest = "ITERATE";
  let min = Infinity;

  Object.entries(simulations).forEach(([k, v]) => {
    if (v.regret < min) {
      min = v.regret;
      safest = k;
    }
  });

  return {
    safest_decision: safest,
    regret_floor: Math.round(min * 100) / 100,
    simulations
  };
}

module.exports = { buildCounterfactuals };
