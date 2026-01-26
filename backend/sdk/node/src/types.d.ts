export interface DecideInput {
  player_id: string;
  session_id: string;
  playtime: number;
  deaths: number;
  restarts: number;
  early_quit: boolean;
  sessions?: any[];
  events?: any[];
}

export interface DecideResult {
  decision: "GO" | "ITERATE" | "KILL";
  risk_score: number;
  confidence: string;
  explanation?: any;
}

export class LaunchSenseClient {
  constructor(config: {
    apiKey: string;
    gameId: string;
    baseUrl: string;
  });

  decide(input: DecideInput): Promise<DecideResult>;
}
