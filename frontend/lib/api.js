// frontend/lib/api.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Generic fetch wrapper
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "API error");
  }

  return data;
}

/**
 * SIGNUP
 */
export async function signup(email) {
  return apiFetch("/signup", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * DECISION ENGINE
 */
export async function submitDecision(payload) {
  return apiFetch("/api/decision", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GAME ANALYTICS
 */
export async function getGameAnalytics(gameId) {
  return apiFetch(`/api/analytics/game/${gameId}`);
}

/**
 * PLAYER ANALYTICS
 */
export async function getPlayerAnalytics(playerId) {
  return apiFetch(`/api/analytics/player/${playerId}`);
}

/**
 * PLAYER RISK TREND
 */
export async function getPlayerTrend(playerId) {
  return apiFetch(`/api/analytics/player/${playerId}/trend`);
}
