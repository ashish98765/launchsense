const DEFAULT_TIMEOUT = 5000;

class LaunchSenseClient {
  constructor({ apiKey, gameId, endpoint }) {
    if (!apiKey) throw new Error("LaunchSense: apiKey required");
    if (!gameId) throw new Error("LaunchSense: gameId required");
    if (!endpoint) throw new Error("LaunchSense: endpoint required");

    this.apiKey = apiKey;
    this.gameId = gameId;
    this.endpoint = endpoint.replace(/\/$/, "");
  }

  async decide(payload, { timeout = DEFAULT_TIMEOUT } = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${this.endpoint}/v1/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "x-game-id": this.gameId
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        return this._fallback("API_ERROR", json?.error);
      }

      return json.data;
    } catch (err) {
      return this._fallback(
        err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
        err.message
      );
    } finally {
      clearTimeout(id);
    }
  }

  _fallback(type, note) {
    return {
      decision: "ITERATE",
      risk_score: 50,
      confidence: "LOW",
      reason: type,
      note
    };
  }
}

module.exports = { LaunchSenseClient };
