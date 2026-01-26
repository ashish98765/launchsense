using UnityEngine;

public class LaunchSenseRunner : MonoBehaviour
{
    private static LaunchSenseRunner _instance;

    public static LaunchSenseRunner Instance
    {
        get
        {
            if (_instance == null)
            {
                GameObject go = new GameObject("LaunchSenseRunner");
                _instance = go.AddComponent<LaunchSenseRunner>();
                DontDestroyOnLoad(go);
            }
            return _instance;
        }
    }
}
