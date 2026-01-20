// insightEngine.js
function extractInsights(body = {}) {
  const insights = {
    primary_risk: null,
    signals: []
  };

  const sessions = body.sessions || [];
  const events = body.events || [];

  // 1️⃣ Early abandonment
  if (sessions.length > 0) {
    const earlyExits = sessions.filter(
      s => s.duration_sec !== undefined && s.duration_sec < 180
    );

    if (earlyExits.length / sessions.length > 0.5) {
      insights.primary_risk = "early_abandonment";
      insights.signals.push(
        "Majority of players exit within first 3 minutes"
      );
    }
  }

  // 2️⃣ Difficulty spikes
  const deaths = events.filter(e => e.type === "death");
  if (deaths.length >= 3) {
    insights.primary_risk ||= "difficulty_spike";
    insights.signals.push(
      "Repeated early deaths indicate difficulty spike"
    );
  }

  // 3️⃣ Engagement decay (fallback)
  if (!insights.primary_risk) {
    insights.primary_risk = "unclear";
    insights.signals.push(
      "No dominant risk pattern detected yet"
    );
  }

  return insights;
}

module.exports = { extractInsights };
