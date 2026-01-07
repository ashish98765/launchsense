// launchsense-sdk.js
class LaunchSenseSDK {
  constructor({ apiKey, apiBase }) {
    if (!apiKey || !apiBase) {
      throw new Error("LaunchSense: apiKey and apiBase required");
    }

    this.apiKey = apiKey;
    this.apiBase = apiBase;
  }

  async trackSession(data) {
    const required = [
      "game_id",
      "player_id",
      "session_id",
      "playtime",
      "deaths",
      "restarts",
      "early_quit"
    ];

    for (let key of required) {
      if (data[key] === undefined) {
        throw new Error(`LaunchSense: Missing ${key}`);
      }
    }

    const res = await fetch(`${this.apiBase}/api/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "LaunchSense error");

    return json;
  }
}

export default LaunchSenseSDK;
