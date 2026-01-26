using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;

public class LaunchSenseClient
{
    private string apiKey;
    private string gameId;
    private string endpoint;

    public LaunchSenseClient(string apiKey, string gameId, string endpoint)
    {
        this.apiKey = apiKey;
        this.gameId = gameId;
        this.endpoint = endpoint;
    }

    public void SendDecisionRequest(
        int playtime,
        int deaths,
        int restarts,
        bool earlyQuit,
        Action<DecisionResponse> callback
    )
    {
        LaunchSenseRunner.Instance.StartCoroutine(
            Send(playtime, deaths, restarts, earlyQuit, callback)
        );
    }

    private IEnumerator Send(
        int playtime,
        int deaths,
        int restarts,
        bool earlyQuit,
        Action<DecisionResponse> callback
    )
    {
        DecisionPayload payload = new DecisionPayload
        {
            playtime = playtime,
            deaths = deaths,
            restarts = restarts,
            early_quit = earlyQuit
        };

        string json = JsonUtility.ToJson(payload);

        UnityWebRequest req = new UnityWebRequest(
            endpoint + "/v1/decide",
            "POST"
        );
        req.uploadHandler = new UploadHandlerRaw(
            System.Text.Encoding.UTF8.GetBytes(json)
        );
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.SetRequestHeader("x-api-key", apiKey);
        req.SetRequestHeader("x-game-id", gameId);

        yield return req.SendWebRequest();

        if (req.result == UnityWebRequest.Result.Success)
        {
            DecisionResponse response =
                JsonUtility.FromJson<DecisionResponse>(
                    req.downloadHandler.text
                );
            callback?.Invoke(response);
        }
    }
}
