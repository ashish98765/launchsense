// Decision Ledger
// Phase-4 Batch-2

const crypto = require("crypto");

/**
 * Builds an immutable ledger record
 * This object MUST NEVER be mutated after insert
 */
function buildLedgerEntry({
  game_id,
  decision,
  source,
  risk_score,
  confidence,
  explanation_id,
  temporal,
  input
}) {
  return {
    ledger_id: crypto.randomUUID(),
    game_id,
    decision,
    decision_source: source, // AI | HUMAN
    risk_score,
    confidence,
    explanation_id,
    temporal_trend: temporal?.trend || null,
    temporal_volatility: temporal?.volatility || null,
    temporal_shock: temporal?.shock || false,
    input_snapshot: {
      playtime: input.playtime || 0,
      deaths: input.deaths || 0,
      restarts: input.restarts || 0,
      early_quit: !!input.early_quit
    },
    created_at: new Date().toISOString()
  };
}

module.exports = { buildLedgerEntry };
