// backend/decisionEngine.js

function calculatePlaytimeRisk(playtimeSeconds) {
  if (playtimeSeconds > 1200) return 0;   // >20 min
  if (playtimeSeconds > 600) return 10;   // 10–20 min
  if (playtimeSeconds > 300) return 25;   // 5–10 min
  return 40;                              // <5 min
}

function calculateFrustrationRisk(deaths, restarts) {
  const score = deaths * 3 + restarts * 5;

  if (score < 10) return 5;
  if (score < 20) return 15;
  return 30;
}

function calculateRiskScore(metrics) {
  const { playtime, deaths, restarts, earlyQuit } = metrics;

  let risk = 0;

  // Playtime
  risk += calculatePlaytimeRisk(playtime);

  // Frustration
  risk += calculateFrustrationRisk(deaths, restarts);

  // Early quit penalty
  if (earlyQuit === true) {
    risk += 25;
  }

  // Chaos pattern
  if (playtime < 300 && deaths >= 5 && earlyQuit === true) {
    risk += 15;
  }

  // Clamp
  if (risk > 100) risk = 100;

  return risk;
}

function getDecision(riskScore) {
  if (riskScore < 30) return "GO";
  if (riskScore < 65) return "ITERATE";
  return "KILL";
}

module.exports = {
  calculateRiskScore,
  getDecision
};
