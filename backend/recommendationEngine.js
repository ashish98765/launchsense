// recommendationEngine.js

function generateRecommendations({ decision, risk_score, insights }) {
  const actions = [];

  // 🚨 Kill-level risk
  if (decision === "KILL" || risk_score > 75) {
    actions.push({
      priority: "critical",
      action: "Pause further development",
      reason: "High early risk detected with low engagement signals"
    });

    actions.push({
      priority: "critical",
      action: "Fix core loop before adding content",
      reason: "Players are exiting before engagement stabilizes"
    });
  }

  // 🔁 Iterate-level risk
  if (decision === "ITERATE") {
    actions.push({
      priority: "high",
      action: "Run another closed playtest after changes",
      reason: "Risk patterns need validation after iteration"
    });
  }

  // 🎯 Specific risk-based advice
  if (insights?.primary_risk === "early_abandonment") {
    actions.push({
      priority: "high",
      action: "Simplify onboarding / tutorial",
      reason: "Majority of exits happen before core loop is learned"
    });
  }

  if (insights?.primary_risk === "difficulty_spike") {
    actions.push({
      priority: "medium",
      action: "Smooth early difficulty curve",
      reason: "Repeated early deaths detected"
    });
  }

  // 🧠 Business guardrail
  if (risk_score > 60) {
    actions.push({
      priority: "warning",
      action: "Do not scale user acquisition",
      reason: "Scaling before retention stabilizes increases burn"
    });
  }

  return actions;
}

module.exports = { generateRecommendations };
