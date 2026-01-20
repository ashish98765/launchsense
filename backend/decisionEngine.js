// decisionEngine.js
// Batch 1: Decision Explanation Layer
// Purpose: Decision ke saath "WHY" + confidence dena

function calculateDecision(metrics) {
  const {
    early_quit_rate,
    avg_session_time,
    deaths_per_session,
    restart_rate
  } = metrics;

  let riskScore = 0;
  const signals = {};
  const secondaryReasons = [];

  // --- Early Quit ---
  if (early_quit_rate > 0.35) {
    riskScore += 35;
    signals.early_quit = "critical";
  } else if (early_quit_rate > 0.2) {
    riskScore += 20;
    signals.early_quit = "warning";
  } else {
    signals.early_quit = "healthy";
  }

  // --- Session Length ---
  if (avg_session_time < 120) {
    riskScore += 25;
    signals.session_length = "poor";
    secondaryReasons.push("Average session time too low");
  } else {
    signals.session_length = "ok";
  }

  // --- Difficulty / Deaths ---
  if (deaths_per_session > 5) {
    riskScore += 20;
    signals.difficulty_spike = "high";
    secondaryReasons.push("Players dying too frequently");
  } else {
    signals.difficulty_spike = "normal";
  }

  // --- Restarts ---
  if (restart_rate > 0.3) {
    riskScore += 10;
    secondaryReasons.push("High restart frequency detected");
  }

  // --- Decision ---
  let decision = "GO";
  if (riskScore >= 70) decision = "KILL";
  else if (riskScore >= 40) decision = "ITERATE";

  // --- Confidence ---
  const confidence = Math.min(0.95, Math.max(0.55, riskScore / 100 + 0.15));

  // --- Primary Reason ---
  let primaryReason = "Healthy engagement signals";
  if (signals.early_quit === "critical")
    primaryReason = "High early quit rate detected";
  else if (signals.session_length === "poor")
    primaryReason = "Players not staying long enough";
  else if (signals.difficulty_spike === "high")
    primaryReason = "Difficulty spike causing frustration";

  return {
    decision,
    riskScore,
    confidence: Number(confidence.toFixed(2)),
    explanation: {
      primary_reason: primaryReason,
      secondary_reasons: secondaryReasons,
      signals
    }
  };
}

module.exports = { calculateDecision };
