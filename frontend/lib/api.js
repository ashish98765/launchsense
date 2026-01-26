// frontend/lib/api.js

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "API request failed");
  }

  return res.json();
}

/* ---------- Public API ---------- */

export const api = {
  getGame(gameId) {
    return request(`/games/${gameId}`);
  },

  getDashboard() {
    return request(`/dashboard`);
  },

  getRules(gameId) {
    return request(`/games/${gameId}/rules`);
  },

  runEvaluation(payload) {
    return request(`/evaluate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
