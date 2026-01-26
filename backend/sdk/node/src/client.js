class LaunchSenseClient {
  constructor({ apiKey, gameId, baseUrl }) {
    if (!apiKey || !gameId || !baseUrl) {
      throw new Error("LaunchSense: apiKey, gameId, baseUrl required");
    }

    this.apiKey = apiKey;
    this.gameId = gameId;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async decide(payload) {
    const res = await fetch(`${this.baseUrl}/v1/decide`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "x-game-id": this.gameId
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(
        `LaunchSense error: ${json.error || "Decision failed"}`
      );
    }

    return json.data;
  }
}

module.exports = { LaunchSenseClient };
