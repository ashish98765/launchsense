using System;

public static class LaunchSense
{
    private static LaunchSenseClient client;

    public static event Action<DecisionResponse> OnDecision;

    public static void Init(string apiKey, string gameId, string endpoint)
    {
        client = new LaunchSenseClient(apiKey, gameId, endpoint);
    }

    public static void SessionEnd(
        int playtimeSeconds,
        int deaths,
        int restarts,
        bool earlyQuit
    )
    {
        if (client == null) return;

        client.SendDecisionRequest(
            playtimeSeconds,
            deaths,
            restarts,
            earlyQuit,
            (response) => {
                OnDecision?.Invoke(response);
            }
        );
    }
}
