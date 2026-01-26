export interface DecisionPayload {
  player_id: string;
  session_id: string;
  playtime: number;
  deaths: number;
  restarts: number;
  early_quit: boolean;
  events?: any[];
  sessions?: any[];
}

export interface DecisionResult {
  decision: "GO" | "ITERATE" | "KILL";
  risk_score: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  note?: string;
}

export class LaunchSenseClient {
  constructor(config: {
    apiKey: string;
    gameId: string;
    endpoint: string;
  });

  decide(
    payload: DecisionPayload,
    options?: { timeout?: number }
  ): Promise<DecisionResult>;
}
