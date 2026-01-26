[Serializable]
public class DecisionPayload
{
    public int playtime;
    public int deaths;
    public int restarts;
    public bool early_quit;
}

[Serializable]
public class DecisionResponse
{
    public string decision;
    public float risk_score;
    public string confidence;
}
